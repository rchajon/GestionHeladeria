import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Order, OrderItem, Product, Profile, UserRole } from '@/lib/database.types'
import { OrdersClient } from '@/components/orders/orders-client'

export const metadata: Metadata = { title: 'Pedidos – Helados Sombrilla' }

// ─── Enriched item type ───────────────────────────────────────────────────────
export interface OrderItemRow extends OrderItem {
  product_name:  string
  product_flavor: string
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  const isAdmin = profile?.role === 'admin'

  // Fetch orders
  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, client_id, status, total_amount, notes, delivery_date, created_at, updated_at')
    .order('created_at', { ascending: false })

  const orders = (ordersRaw ?? []) as Order[]

  // Fetch order items with product info for all orders in one query
  let itemsMap: Record<string, OrderItemRow[]> = {}
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id)
    const { data: itemsRaw } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, subtotal, created_at, product:products(name, flavor)')
      .in('order_id', orderIds)

    const items = (itemsRaw ?? []) as (OrderItem & { product: { name: string; flavor: string }[] | null })[]
    items.forEach(item => {
      const product = item.product?.[0]
      const row: OrderItemRow = {
        ...item,
        product_name:   product?.name   ?? '—',
        product_flavor: product?.flavor ?? '—',
      }
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = []
      itemsMap[item.order_id].push(row)
    })
  }

  // Enrich orders with client profile (admin sees all clients)
  let profileMap: Record<string, Pick<Profile, 'full_name' | 'business_name'>> = {}
  if (isAdmin && orders.length > 0) {
    const clientIds = [...new Set(orders.map(o => o.client_id))]
    const { data: profilesRaw } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', clientIds)
    const profiles = (profilesRaw ?? []) as (Pick<Profile, 'full_name' | 'business_name'> & { id: string })[]
    profileMap = Object.fromEntries(profiles.map(p => [p.id, { full_name: p.full_name, business_name: p.business_name }]))
  }

  const ordersWithProfile = orders.map(o => ({
    ...o,
    profile: profileMap[o.client_id],
    items:   itemsMap[o.id] ?? [],
  }))

  // Active products for order creation form — ALL products so new ones always appear
  const { data: productsRaw } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')
  const products = (productsRaw ?? []) as Product[]

  return (
    <OrdersClient
      initialOrders={ordersWithProfile}
      products={products}
      clientId={user.id}
      isAdmin={isAdmin}
    />
  )
}
