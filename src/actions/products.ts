'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Product } from '@/lib/database.types'

const ProductSchema = z.object({
  name:           z.string().min(2, 'Nombre requerido'),
  description:    z.string().optional(),
  flavor:         z.string().min(1, 'Sabor requerido'),
  price_per_unit: z.coerce.number().positive('Precio debe ser mayor a 0'),
  unit_label:     z.string().min(1, 'Unidad requerida'),
  stock:          z.coerce.number().int().min(0, 'Stock no puede ser negativo'),
  min_stock:      z.coerce.number().int().min(0),
})

export async function createProduct(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const parsed   = ProductSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors.join(', ') || 'Datos inválidos.' }
  }

  const { data: productRaw, error } = await supabase
    .from('products')
    .insert({ ...parsed.data, is_active: true })
    .select('id')
    .single()

  if (error || !productRaw) return { success: false, error: error?.message ?? 'Error al crear producto.' }
  const product = productRaw as { id: string }
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/inventory')
  return { success: true, data: { id: product.id } }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const parsed   = ProductSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors.join(', ') || 'Datos inválidos.' }
  }

  const { error } = await supabase
    .from('products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true, data: null }
}

export async function toggleProductStatus(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true, data: null }
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('name')
  return (data ?? []) as Product[]
}
