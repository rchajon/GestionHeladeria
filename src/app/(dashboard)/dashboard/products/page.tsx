import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/database.types'
import { ProductsClient } from '@/components/products/products-client'

export const metadata: Metadata = { title: 'Productos – Helados Sombrilla' }

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('name')

  const products = (data ?? []) as Product[]

  return <ProductsClient initialProducts={products} />
}
