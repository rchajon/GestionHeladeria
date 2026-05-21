import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Order, UserRole } from '@/lib/database.types'
import { ClientsClient } from '@/components/clients/clients-client'

export const metadata: Metadata = { title: 'Clientes – Helados Sombrilla' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin guard
  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch all client profiles
  const { data: clientsRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('business_name')

  const clients = (clientsRaw ?? []) as Profile[]

  // Fetch all orders to compute stats per client
  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, client_id, status, total_amount, created_at')
    .order('created_at', { ascending: false })

  const orders = (ordersRaw ?? []) as Pick<Order, 'id' | 'client_id' | 'status' | 'total_amount' | 'created_at'>[]

  // Compute stats per client
  const clientsWithStats = clients.map(c => {
    const clientOrders = orders.filter(o => o.client_id === c.id)
    const paidOrders   = clientOrders.filter(o => ['paid', 'in_delivery', 'delivered'].includes(o.status))
    const debtOrders   = clientOrders.filter(o => o.status === 'awaiting_payment')
    return {
      ...c,
      total_orders:  clientOrders.length,
      total_spent:   paidOrders.reduce((s, o) => s + o.total_amount, 0),
      pending_debt:  debtOrders.reduce((s, o) => s + o.total_amount, 0),
      last_order_at: clientOrders[0]?.created_at ?? null,
    }
  })

  return <ClientsClient clients={clientsWithStats} allOrders={orders} />
}
