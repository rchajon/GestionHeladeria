'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, CreateProductionPayload } from '@/lib/database.types'

export async function registerProduction(
  payload: CreateProductionPayload
): Promise<ActionResult<{ production_id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  if (payload.quantity <= 0) {
    return { success: false, error: 'Quantity must be greater than zero.' }
  }

  // Fetch current stock
  const { data: productRaw } = await supabase
    .from('products')
    .select('id, stock, is_active')
    .eq('id', payload.product_id)
    .single()

  if (!productRaw) return { success: false, error: 'Producto no encontrado.' }
  const product = productRaw as { id: string; stock: number; is_active: boolean }
  if (!product.is_active) return { success: false, error: 'No se puede producir un producto descontinuado.' }

  const newStock = product.stock + payload.quantity

  // Update stock
  const { error: stockError } = await supabase
    .from('products')
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', payload.product_id)

  if (stockError) return { success: false, error: 'Failed to update stock.' }

  // Insert production record
  const { data: recordRaw, error: prodError } = await supabase
    .from('production_records')
    .insert({
      product_id:  payload.product_id,
      quantity:    payload.quantity,
      batch_notes: payload.batch_notes ?? null,
      produced_at: payload.produced_at,
      created_by:  user.id,
    })
    .select('id')
    .single()

  if (prodError || !recordRaw) {
    // Best-effort: compensate stock
    await supabase
      .from('products')
      .update({ stock: product.stock, updated_at: new Date().toISOString() })
      .eq('id', payload.product_id)
    return { success: false, error: 'Failed to record production.' }
  }

  const record = recordRaw as { id: string }

  // Inventory movement (type: in)
  await supabase.from('inventory_movements').insert({
    product_id:     payload.product_id,
    movement_type:  'in' as const,
    quantity:       payload.quantity,
    stock_before:   product.stock,
    stock_after:    newStock,
    reference_id:   record.id,
    reference_type: 'production',
    notes:          payload.batch_notes ?? `Production batch ${payload.produced_at}`,
    created_by:     user.id,
  })

  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/inventory')
  return { success: true, data: { production_id: record.id } }
}
