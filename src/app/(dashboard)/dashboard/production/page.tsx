import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Product, ProductionRecord } from '@/lib/database.types'
import { ProductionClient } from '@/components/production/production-client'

export const metadata: Metadata = { title: 'Producción – Helados Sombrilla' }

export default async function ProductionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recordsRes, productsRes] = await Promise.all([
    supabase.from('production_records').select('*').order('produced_at', { ascending: false }),
    supabase.from('products').select('*').order('name'),  // all products (active + inactive) for filter
  ])

  const records  = (recordsRes.data  ?? []) as ProductionRecord[]
  const products = (productsRes.data ?? []) as Product[]

  // Enrich with product name
  const productMap = new Map(products.map(p => [p.id, p.name]))

  // Enrich with creator name
  const creatorIds = [...new Set(records.map(r => r.created_by).filter(Boolean))]
  let creatorMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: creatorsRaw } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', creatorIds)
    creatorMap = Object.fromEntries(
      ((creatorsRaw ?? []) as { id: string; full_name: string; business_name: string | null }[])
        .map(c => [c.id, c.business_name ?? c.full_name])
    )
  }

  const enriched = records.map(r => ({
    ...r,
    product_name: productMap.get(r.product_id) ?? '—',
    creator_name: creatorMap[r.created_by] ?? undefined,
  }))

  // Pass only active products to the form selector
  const activeProducts = products.filter(p => p.is_active)

  return <ProductionClient records={enriched} products={activeProducts} />
}
