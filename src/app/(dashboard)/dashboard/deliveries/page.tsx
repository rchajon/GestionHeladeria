import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Order, Profile, UserRole } from '@/lib/database.types'
import { DeliveriesClient } from '@/components/deliveries/deliveries-client'

export const metadata: Metadata = { title: 'Entregas – Helados Sombrilla Artesanal' }

export default async function DeliveriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  if (profile?.role !== 'admin') redirect('/dashboard')

  // ── Active deliveries (paid + in_delivery) ──────────────────────────────────
  const { data: activeRaw } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['paid', 'in_delivery'])
    .order('updated_at', { ascending: false })

  // ── Delivery history (delivered orders) ────────────────────────────────────
  const { data: historyRaw } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered')
    .order('updated_at', { ascending: false })
    .limit(100)

  // ── Delivery events (timeline) ─────────────────────────────────────────────
  const { data: eventsRaw } = await supabase
    .from('delivery_events')
    .select('*')
    .order('created_at', { ascending: false })

  const activeOrders  = (activeRaw  ?? []) as Order[]
  const historyOrders = (historyRaw ?? []) as Order[]
  const allOrders     = [...activeOrders, ...historyOrders]

  // ── Enrich with client names ───────────────────────────────────────────────
  const clientIds = [...new Set(allOrders.map(o => o.client_id))]
  let profileMap: Record<string, string> = {}

  if (clientIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', clientIds)
    const profiles = (profilesRaw ?? []) as (Pick<Profile, 'full_name' | 'business_name'> & { id: string })[]
    profileMap = Object.fromEntries(profiles.map(p => [p.id, p.business_name ?? p.full_name]))
  }

  // ── Enrich admin names for events ─────────────────────────────────────────
  const adminIds = [...new Set((eventsRaw ?? []).map((e: any) => e.changed_by).filter(Boolean))]
  let adminMap: Record<string, string> = {}

  if (adminIds.length > 0) {
    const { data: adminsRaw } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', adminIds)
    adminMap = Object.fromEntries(((adminsRaw ?? []) as { id: string; full_name: string }[]).map(p => [p.id, p.full_name]))
  }

  const enrichActive  = activeOrders.map(o  => ({ ...o,  client_name: profileMap[o.client_id]  ?? '—' }))
  const enrichHistory = historyOrders.map(o => ({ ...o,  client_name: profileMap[o.client_id]  ?? '—' }))
  const enrichEvents  = (eventsRaw ?? []).map((e: any) => ({ ...e, admin_name: adminMap[e.changed_by] ?? '—' }))

  return (
    <DeliveriesClient
      orders={enrichActive}
      history={enrichHistory}
      deliveryEvents={enrichEvents}
    />
  )
}
