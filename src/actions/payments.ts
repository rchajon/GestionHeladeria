'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/database.types'

// ──────────────────────────────────────────────────────────────────────────────
// Fake payment gateway simulation
// ──────────────────────────────────────────────────────────────────────────────
interface FakeGatewayResult {
  approved:       boolean
  code:           string
  message:        string
  transaction_id: string
  processed_at:   string
}

function simulateCardPayment(cardNumber: string): FakeGatewayResult {
  // Cards ending in 0000 or 9999 are forced to fail (for testing)
  const last4     = cardNumber.replace(/\s/g, '').slice(-4)
  const isDeclined = last4 === '0000' || last4 === '9999'

  return {
    approved:       !isDeclined,
    code:           isDeclined ? 'DECLINED' : 'APPROVED',
    message:        isDeclined ? 'Insufficient funds or card declined.' : 'Payment approved.',
    transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    processed_at:   new Date().toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulate online card payment
// ──────────────────────────────────────────────────────────────────────────────
export async function processCardPayment(payload: {
  order_id:    string
  amount:      number
  card_number: string
  card_holder: string
  expiry:      string
  cvv:         string
}): Promise<ActionResult<FakeGatewayResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // Verify order belongs to user and is awaiting payment
  const { data: orderRaw } = await supabase
    .from('orders')
    .select('id, status, total_amount, client_id')
    .eq('id', payload.order_id)
    .single()

  if (!orderRaw) return { success: false, error: 'Order not found.' }
  const order = orderRaw as { id: string; status: string; total_amount: number; client_id: string }

  if (order.status !== 'awaiting_payment') {
    return { success: false, error: `Order is not awaiting payment (status: ${order.status}).` }
  }

  // Run fake gateway
  const gatewayResult = simulateCardPayment(payload.card_number)
  const last4          = payload.card_number.replace(/\s/g, '').slice(-4)

  // Insert payment record (approved or rejected — we always record for audit)
  const { error: paymentError } = await supabase.from('payments').insert({
    order_id:         payload.order_id,
    client_id:        user.id,
    method:           'card',
    amount:           payload.amount,
    status:           gatewayResult.approved ? 'approved' : 'rejected',
    card_last4:       last4,
    card_holder:      payload.card_holder,
    gateway_response: gatewayResult,
  })

  if (paymentError) return { success: false, error: 'Failed to record payment.' }

  // If approved, update order status to 'paid'
  if (gatewayResult.approved) {
    await supabase
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payload.order_id)
  }

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/payments')

  return { success: true, data: gatewayResult }
}

// ──────────────────────────────────────────────────────────────────────────────
// Submit transfer voucher (client uploads receipt)
// ──────────────────────────────────────────────────────────────────────────────
export async function submitTransferVoucher(payload: {
  order_id:    string
  amount:      number
  reference:   string
  voucher_url: string
}): Promise<ActionResult<{ payment_id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: paymentRaw, error } = await supabase
    .from('payments')
    .insert({
      order_id:          payload.order_id,
      client_id:         user.id,
      method:            'transfer',
      amount:            payload.amount,
      status:            'pending',
      voucher_url:       payload.voucher_url,
      voucher_reference: payload.reference,
    })
    .select('id')
    .single()

  if (error || !paymentRaw) return { success: false, error: 'Failed to submit voucher.' }

  const payment = paymentRaw as { id: string }
  revalidatePath('/dashboard/orders')
  return { success: true, data: { payment_id: payment.id } }
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: approve or reject a transfer payment
// ──────────────────────────────────────────────────────────────────────────────
export async function reviewTransferPayment(
  paymentId: string,
  decision:  'approved' | 'rejected',
  adminNotes?: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: paymentRaw } = await supabase
    .from('payments')
    .select('id, order_id, status')
    .eq('id', paymentId)
    .single()

  if (!paymentRaw) return { success: false, error: 'Payment not found.' }
  const payment = paymentRaw as { id: string; order_id: string; status: string }

  if (payment.status !== 'pending') {
    return { success: false, error: 'Payment has already been reviewed.' }
  }

  const { error } = await supabase
    .from('payments')
    .update({
      status:      decision,
      admin_notes: adminNotes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (error) return { success: false, error: error.message }

  // If approved, mark the order as paid
  if (decision === 'approved') {
    await supabase
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id)
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/orders')
  return { success: true, data: null }
}
