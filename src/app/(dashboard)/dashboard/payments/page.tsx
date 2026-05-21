import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Payment, Order, UserRole } from '@/lib/database.types'
import { PaymentsClient } from '@/components/payments/payments-client'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Pagos – Helados Sombrilla' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  const isAdmin = profile?.role === 'admin'

  const [paymentsRes, pendingOrdersRes] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false }),

    // Orders awaiting payment for this user (or all if admin)
    isAdmin
      ? supabase
          .from('orders')
          .select('id, total_amount, status, client_id, created_at')
          .eq('status', 'awaiting_payment')
          .order('created_at', { ascending: false })
      : supabase
          .from('orders')
          .select('id, total_amount, status, client_id, created_at')
          .eq('status', 'awaiting_payment')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false }),
  ])

  const payments      = (paymentsRes.data      ?? []) as Payment[]
  const pendingOrders = (pendingOrdersRes.data  ?? []) as Pick<Order, 'id' | 'total_amount' | 'status' | 'client_id' | 'created_at'>[]

  return (
    <Suspense fallback={<div className="text-slate-400">Cargando...</div>}>
      <PaymentsClient
        initialPayments={payments}
        pendingOrders={pendingOrders}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </Suspense>
  )
}
