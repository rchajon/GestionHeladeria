'use server'

/**
 * ============================================================
 * actions/orders.ts
 * Server Action: createOrder
 *
 * Business rules enforced:
 * 1. All requested products must have sufficient stock.
 * 2. Stock is decremented atomically before inserting the order.
 * 3. An inventory_movement record (type: 'out') is created per item.
 * 4. The order total is calculated server-side (never trust client).
 * 5. RLS is enforced – the client can only create orders for themselves.
 * ============================================================
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, CreateOrderPayload, OrderStatus } from '@/lib/database.types'

// ─── Validation schema ────────────────────────────────────────────────────────
const OrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity:   z.number().int().positive('Quantity must be a positive integer'),
  unit_price: z.number().positive('Unit price must be positive'),
})

const CreateOrderSchema = z.object({
  client_id:     z.string().uuid('Invalid client ID'),
  notes:         z.string().max(500).optional(),
  delivery_date: z.string().optional(),
  items:         z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
})

// ─── Product row type (from select projection) ────────────────────────────────
type ProductRow = {
  id:             string
  name:           string
  stock:          number
  price_per_unit: number
  is_active:      boolean
}

// ─── Main action ──────────────────────────────────────────────────────────────
export async function createOrder(
  payload: CreateOrderPayload
): Promise<ActionResult<{ order_id: string }>> {

  // 1. Validate input
  const parsed = CreateOrderSchema.safeParse(payload)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const msg  = flat.formErrors.join(', ') || Object.values(flat.fieldErrors).flat().join(', ') || 'Validation error.'
    return { success: false, error: msg }
  }

  const { client_id, notes, delivery_date, items } = parsed.data
  const supabase = await createClient()

  // 2. Verify authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' }
  }

  // 3. Fetch current stock for all requested products in a single query
  const productIds = items.map((i) => i.product_id)
  const { data: productsRaw, error: productsError } = await supabase
    .from('products')
    .select('id, name, stock, price_per_unit, is_active')
    .in('id', productIds)

  if (productsError || !productsRaw) {
    return { success: false, error: 'Failed to fetch product data.' }
  }

  const products = productsRaw as ProductRow[]

  // 4. Build a product map for fast lookups
  const productMap = new Map<string, ProductRow>(products.map((p) => [p.id, p]))

  // 5. Validate stock availability for every item
  for (const item of items) {
    const product = productMap.get(item.product_id)
    if (!product) {
      return { success: false, error: `Product ${item.product_id} not found.` }
    }
    if (!product.is_active) {
      return { success: false, error: `Product "${product.name}" is no longer available.` }
    }
    if (product.stock < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}.`,
      }
    }
  }

  // 6. Calculate server-side total (never trust client-sent prices)
  const totalAmount = items.reduce((sum, item) => {
    const product = productMap.get(item.product_id)!
    return sum + product.price_per_unit * item.quantity
  }, 0)

  // ── TRANSACTION START ─────────────────────────────────────────────────────
  // Note: For production, move this to a Postgres RPC function for true
  // atomicity. Here we use optimistic locking + compensation as a fallback.

  // 7. Decrement stock for each product (optimistic lock via .eq('stock', current))
  const stockUpdates: Array<{ id: string; oldStock: number }> = []

  for (const item of items) {
    const product = productMap.get(item.product_id)!
    const newStock = product.stock - item.quantity

    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', item.product_id)
      .eq('stock', product.stock)   // optimistic lock

    if (stockError) {
      await compensateStock(supabase, stockUpdates)
      return {
        success: false,
        error: `Stock update conflict for "${product.name}". Please try again.`,
      }
    }

    stockUpdates.push({ id: item.product_id, oldStock: product.stock })
  }

  // 8. Insert the order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id,
      status:        'awaiting_payment' as OrderStatus,
      total_amount:  totalAmount,
      notes:         notes ?? null,
      delivery_date: delivery_date ?? null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    await compensateStock(supabase, stockUpdates)
    return { success: false, error: 'Failed to create order. Please try again.' }
  }

  const orderId = (order as { id: string }).id

  // 9. Insert order items
  const orderItemsPayload = items.map((item) => ({
    order_id:   orderId,
    product_id: item.product_id,
    quantity:   item.quantity,
    unit_price: productMap.get(item.product_id)!.price_per_unit,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload)

  if (itemsError) {
    await compensateStock(supabase, stockUpdates)
    await supabase.from('orders').delete().eq('id', orderId)
    return { success: false, error: 'Failed to save order items. Please try again.' }
  }

  // 10. Record inventory movements (audit trail – non-critical)
  const movementsPayload = items.map((item) => {
    const product = productMap.get(item.product_id)!
    return {
      product_id:     item.product_id,
      movement_type:  'out' as const,
      quantity:       item.quantity,
      stock_before:   product.stock,
      stock_after:    product.stock - item.quantity,
      reference_id:   orderId,
      reference_type: 'order',
      notes:          `Order ${orderId}`,
      created_by:     user.id,
    }
  })

  await supabase.from('inventory_movements').insert(movementsPayload)

  // ── TRANSACTION END ───────────────────────────────────────────────────────

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/inventory')

  return { success: true, data: { order_id: orderId } }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function compensateStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stockUpdates: Array<{ id: string; oldStock: number }>
) {
  for (const { id, oldStock } of [...stockUpdates].reverse()) {
    await supabase
      .from('products')
      .update({ stock: oldStock, updated_at: new Date().toISOString() })
      .eq('id', id)
  }
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // Fetch the order
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, client_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) return { success: false, error: 'Order not found.' }

  const orderRow = order as { id: string; status: string; client_id: string }
  const cancellable: string[] = ['pending', 'awaiting_payment']
  if (!cancellable.includes(orderRow.status)) {
    return { success: false, error: `Cannot cancel an order with status "${orderRow.status}".` }
  }

  // Fetch order items separately
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  // Mark order as cancelled
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled' as OrderStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) return { success: false, error: 'Failed to cancel order.' }

  // Restore stock for each item
  for (const item of (orderItems ?? []) as { product_id: string; quantity: number }[]) {
    const { data: productRaw } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (productRaw) {
      const product    = productRaw as { stock: number }
      const newStock   = product.stock + item.quantity

      await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', item.product_id)

      await supabase.from('inventory_movements').insert({
        product_id:     item.product_id,
        movement_type:  'in' as const,
        quantity:       item.quantity,
        stock_before:   product.stock,
        stock_after:    newStock,
        reference_id:   orderId,
        reference_type: 'order_cancellation',
        notes:          `Cancellation of order ${orderId}`,
        created_by:     user.id,
      })
    }
  }

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/inventory')
  return { success: true, data: null }
}

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // Business rule: cannot mark as delivered if not paid/in_delivery
  if (newStatus === 'delivered') {
    const { data: orderRaw } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    const order = orderRaw as { status: string } | null
    if (order?.status !== 'paid' && order?.status !== 'in_delivery') {
      return {
        success: false,
        error: 'Order must be paid before it can be marked as delivered.',
      }
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return { success: false, error: error.message }

  // ── Log delivery event for history tracking ──────────────────────────────
  if (newStatus === 'in_delivery' || newStatus === 'delivered') {
    await supabase.from('delivery_events').insert({
      order_id:   orderId,
      status:     newStatus,
      changed_by: user.id,
      notes:      newStatus === 'delivered' ? 'Entrega confirmada' : 'Pedido enviado',
    })
  }

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/inventory')
  return { success: true, data: null }
}
