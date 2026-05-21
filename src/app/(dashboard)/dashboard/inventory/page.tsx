import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Product, InventoryMovement, UserRole } from '@/lib/database.types'
import { InventoryClient } from '@/components/inventory/inventory-client'

export const metadata: Metadata = { title: 'Inventario – Helados Sombrilla' }

export default async function InventoryPage() {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin guard
  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch data in parallel
  const [productsRes, movementsRes] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const products  = (productsRes.data  ?? []) as Product[]
  const movements = (movementsRes.data ?? []) as InventoryMovement[]

  // Enrich movements with product name
  const productMap = new Map(products.map(p => [p.id, p.name]))

  // Enrich with creator name
  const creatorIds = [...new Set(movements.map(m => m.created_by).filter(Boolean))] as string[]
  let creatorMap: Record<string, string> = {}

  if (creatorIds.length > 0) {
    const { data: creatorsRaw } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', creatorIds)

    const creators = (creatorsRaw ?? []) as { id: string; full_name: string; business_name: string | null }[]
    creatorMap = Object.fromEntries(creators.map(c => [c.id, c.business_name ?? c.full_name]))
  }

  const enriched = movements.map(m => ({
    ...m,
    product_name: productMap.get(m.product_id) ?? '—',
    creator_name: m.created_by ? (creatorMap[m.created_by] ?? '—') : undefined,
  }))

  return <InventoryClient products={products} movements={enriched} />
}
