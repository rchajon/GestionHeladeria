'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/database.types'

const AdjustmentSchema = z.object({
  product_id:    z.string().uuid('Producto inválido'),
  movement_type: z.enum(['in', 'out', 'adjustment']),
  quantity:      z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  notes:         z.string().max(300).optional(),
})

/**
 * Registra un movimiento manual de inventario y actualiza el stock del producto.
 * Solo administradores pueden ejecutar esta acción.
 */
export async function addInventoryAdjustment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  // Admin check
  const { data: profileRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'admin') return { success: false, error: 'Solo administradores pueden ajustar inventario.' }

  // Validate
  const parsed = AdjustmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors.join(', ') || 'Datos inválidos.' }
  }

  const { product_id, movement_type, quantity, notes } = parsed.data

  // Get current stock
  const { data: productRaw, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, stock')
    .eq('id', product_id)
    .single()

  if (fetchErr || !productRaw) return { success: false, error: 'Producto no encontrado.' }

  const product    = productRaw as { id: string; name: string; stock: number }
  const stockBefore = product.stock

  // Calculate new stock
  let stockAfter: number
  if (movement_type === 'in')         stockAfter = stockBefore + quantity
  else if (movement_type === 'out')   stockAfter = stockBefore - quantity
  else                                stockAfter = quantity   // adjustment = set absolute value

  if (stockAfter < 0) {
    return { success: false, error: `Stock insuficiente. Stock actual: ${stockBefore}, solicitado: ${quantity}.` }
  }

  // Update product stock
  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock: stockAfter, updated_at: new Date().toISOString() })
    .eq('id', product_id)

  if (updateErr) return { success: false, error: updateErr.message }

  // Record movement
  const { error: movErr } = await supabase.from('inventory_movements').insert({
    product_id,
    movement_type,
    quantity,
    stock_before:   stockBefore,
    stock_after:    stockAfter,
    reference_type: 'manual_adjustment',
    notes:          notes ?? null,
    created_by:     user.id,
  })

  if (movErr) {
    // Roll back stock update
    await supabase.from('products').update({ stock: stockBefore }).eq('id', product_id)
    return { success: false, error: 'Error al registrar movimiento.' }
  }

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard/products')
  return { success: true, data: null }
}
