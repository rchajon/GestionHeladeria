'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import type { Order, Payment } from '@/lib/database.types'
import { formatCurrency, formatDate, PAYMENT_STATUS_CONFIG } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SearchInput } from '@/components/ui/search-input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { processCardPayment, reviewTransferPayment, submitTransferVoucher } from '@/actions/payments'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Building2, Receipt } from 'lucide-react'

interface PendingOrder extends Pick<Order, 'id' | 'total_amount' | 'status' | 'client_id' | 'created_at'> {}

interface PaymentsClientProps {
  initialPayments: Payment[]
  pendingOrders:   PendingOrder[]
  isAdmin:         boolean
  userId:          string
}

const PAGE_SIZE = 10

export function PaymentsClient({ initialPayments, pendingOrders, isAdmin, userId }: PaymentsClientProps) {
  const router         = useRouter()
  const params         = useSearchParams()
  const prefillOrderId = params.get('order_id') ?? ''
  const prefillAmount  = params.get('amount')   ?? ''

  const [payments, setPayments]   = useState(initialPayments)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [payModal, setPayModal]   = useState(!!prefillOrderId)
  const [payMethod, setPayMethod] = useState<'card' | 'transfer'>('card')
  const [loading, setLoading]     = useState(false)
  const [orderId, setOrderId]     = useState(prefillOrderId)
  const [amount, setAmount]       = useState(prefillAmount)
  const [page, setPage]           = useState(1)
  const { show, ToastComponent }  = useToast()

  // Sync with server data after router.refresh()
  useEffect(() => { setPayments(initialPayments) }, [initialPayments])

  // Confirm reject dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  // Card form state
  const [card, setCard] = useState({ number: '', holder: '', expiry: '', cvv: '' })

  // Transfer state
  const [reference, setReference]       = useState('')
  const [voucherFile, setVoucherFile]   = useState<File | null>(null)
  const [uploading, setUploading]       = useState(false)

  const debouncedSearch = useDebounce(search, 250)

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = payments.filter(p => {
    const q = debouncedSearch.toLowerCase()
    const matchSearch =
      p.order_id.toLowerCase().includes(q) ||
      (p.card_holder ?? '').toLowerCase().includes(q) ||
      (p.voucher_reference ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // When user selects a pending order, auto-fill amount
  function handleOrderSelect(selectedId: string) {
    setOrderId(selectedId)
    const order = pendingOrders.find(o => o.id === selectedId)
    if (order) setAmount(String(order.total_amount))
  }

  function formatCardNumber(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  // ── Process card payment ───────────────────────────────────────────────
  async function handleCardPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId || !amount) { show('Selecciona un pedido.', 'error'); return }
    setLoading(true)
    const result = await processCardPayment({
      order_id: orderId, amount: parseFloat(amount),
      card_number: card.number, card_holder: card.holder,
      expiry: card.expiry, cvv: card.cvv,
    })
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }

    if (result.data.approved) {
      show(`Pago aprobado. Ref: ${result.data.transaction_id}`, 'success')
      setPayModal(false)
      router.refresh()
    } else {
      show('Tarjeta rechazada. Verifica los datos o usa otra tarjeta.', 'error')
    }
  }

  // ── Process transfer voucher ───────────────────────────────────────────
  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId || !amount)  { show('Selecciona un pedido.', 'error'); return }
    if (!reference)           { show('Ingresa la referencia bancaria.', 'error'); return }
    if (!voucherFile)         { show('Selecciona el comprobante.', 'error'); return }

    setUploading(true)

    // 1. Upload voucher to Supabase Storage
    const supabase = createClient()
    const fileName = `${userId}/${Date.now()}-${voucherFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('vouchers')
      .upload(fileName, voucherFile)

    if (uploadError) {
      show('Error al subir el comprobante: ' + uploadError.message, 'error')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('vouchers').getPublicUrl(fileName)
    setUploading(false)

    // 2. Actually register the payment in the DB ← THE CRITICAL FIX
    setLoading(true)
    const result = await submitTransferVoucher({
      order_id:    orderId,
      amount:      parseFloat(amount),
      reference:   reference,
      voucher_url: urlData.publicUrl,
    })
    setLoading(false)

    if (!result.success) { show(result.error, 'error'); return }

    // Optimistic update
    show('Comprobante enviado. El admin revisará tu pago pronto.', 'success')
    setPayModal(false)
    setReference('')
    setVoucherFile(null)
    router.refresh()
  }

  // ── Admin: review transfer ─────────────────────────────────────────────
  async function handleApprove(paymentId: string) {
    const result = await reviewTransferPayment(paymentId, 'approved', undefined)
    if (!result.success) { show(result.error, 'error'); return }
    setPayments(ps => ps.map(p => p.id === paymentId ? { ...p, status: 'approved' } : p))
    show('Pago aprobado.', 'success')
  }

  async function handleReject() {
    if (!rejectTarget) return
    const result = await reviewTransferPayment(rejectTarget, 'rejected', undefined)
    setRejectTarget(null)
    if (!result.success) { show(result.error, 'error'); return }
    setPayments(ps => ps.map(p => p.id === rejectTarget ? { ...p, status: 'rejected' } : p))
    show('Pago rechazado.', 'info')
  }

  const sc = PAYMENT_STATUS_CONFIG

  return (
    <>
      {ToastComponent}

      <ConfirmDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title="¿Rechazar este pago?"
        description="El comprobante será marcado como rechazado."
        confirmLabel="Sí, rechazar"
        variant="destructive"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagos</h1>
          <p className="text-slate-400 text-sm mt-0.5">{payments.length} transacciones</p>
        </div>
        <Button id="btn-new-payment" onClick={() => setPayModal(true)}>
          + Realizar Pago
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          placeholder="Buscar por ID, titular…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          containerClassName="max-w-xs"
        />
        <Select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-44">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </Select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>ID Pedido</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Fecha</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.length === 0
              ? (
                <TableEmptyState
                  colSpan={isAdmin ? 6 : 5}
                  icon={<Receipt className="w-6 h-6" />}
                  title={search ? 'Sin resultados' : 'No hay pagos registrados'}
                  description={search ? 'No hay pagos con esos filtros.' : 'Los pagos aparecerán aquí cuando realices una transacción.'}
                />
              )
              : paginated.map(payment => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <button
                      className="font-mono text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                      title={`Copiar ID: ${payment.order_id}`}
                      onClick={() => { navigator.clipboard.writeText(payment.order_id); show('ID copiado', 'info') }}
                    >
                      {payment.order_id.slice(0, 8)}…
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      {payment.method === 'card'
                        ? <><CreditCard className="w-3.5 h-3.5 text-slate-500" /> Tarjeta
                            {payment.card_last4 && <span className="text-slate-500">••{payment.card_last4}</span>}
                          </>
                        : <><Building2 className="w-3.5 h-3.5 text-slate-500" /> Transferencia</>
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={sc[payment.status].color}>{sc[payment.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">{formatDate(payment.created_at)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {payment.status === 'pending' && payment.method === 'transfer' && (
                        <div className="flex items-center justify-end gap-2">
                          {payment.voucher_url && (
                            <a href={payment.voucher_url} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">Ver comprobante</Button>
                            </a>
                          )}
                          <Button size="sm" variant="success" onClick={() => handleApprove(payment.id)}>Aprobar</Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectTarget(payment.id)}>Rechazar</Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            }
          </TableBody>
        </Table>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          label="pagos"
        />
      </div>

      {/* ── Payment Modal ── */}
      <Dialog open={payModal} onClose={() => setPayModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Realizar Pago</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5">
            {/* Order selector or prefill display */}
            {prefillOrderId ? (
              <div className="bg-slate-800/60 rounded-xl p-3 flex justify-between items-center">
                <span className="text-slate-400 text-sm">Total a pagar</span>
                <span className="text-emerald-400 text-xl font-bold">{formatCurrency(parseFloat(amount || '0'))}</span>
              </div>
            ) : (
              <FormField label="Pedido a pagar" required>
                {pendingOrders.length > 0 ? (
                  <>
                    <Select
                      value={orderId}
                      onChange={e => handleOrderSelect(e.target.value)}
                      required
                    >
                      <option value="">— Selecciona un pedido —</option>
                      {pendingOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.id.slice(0, 8)}… · {formatCurrency(o.total_amount)} · {formatDate(o.created_at)}
                        </option>
                      ))}
                    </Select>
                    {orderId && amount && (
                      <p className="text-sm text-emerald-400 mt-1 font-semibold">
                        Total: {formatCurrency(parseFloat(amount))}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="bg-slate-800/60 rounded-xl p-3 text-sm text-slate-400">
                    No hay pedidos pendientes de pago.
                  </div>
                )}
              </FormField>
            )}

            {/* Method selector */}
            <div className="flex gap-2">
              {(['card', 'transfer'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition ${
                    payMethod === m
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {m === 'card' ? '💳 Tarjeta' : '🏦 Transferencia'}
                </button>
              ))}
            </div>

            {/* Card form */}
            {payMethod === 'card' && (
              <form id="card-form" onSubmit={handleCardPayment} className="space-y-3">
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 shadow-lg space-y-3">
                  <p className="text-xs text-slate-400">TARJETA DE PRUEBA</p>
                  <FormField label="Número de tarjeta" required>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={card.number}
                      onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                      maxLength={19} required
                    />
                  </FormField>
                  <FormField label="Titular" required>
                    <Input placeholder="NOMBRE APELLIDO" value={card.holder}
                      onChange={e => setCard(c => ({ ...c, holder: e.target.value.toUpperCase() }))} required />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Vencimiento" required>
                      <Input placeholder="MM/AA" maxLength={5} value={card.expiry}
                        onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))} required />
                    </FormField>
                    <FormField label="CVV" required>
                      <Input placeholder="123" maxLength={4} type="password" value={card.cvv}
                        onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} required />
                    </FormField>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  💡 Usar terminar en <code className="text-rose-400">0000</code> o <code className="text-rose-400">9999</code> simula rechazo.
                </p>
              </form>
            )}

            {/* Transfer form */}
            {payMethod === 'transfer' && (
              <form id="transfer-form" onSubmit={handleTransferSubmit} className="space-y-3">
                <FormField label="Referencia bancaria" required>
                  <Input placeholder="REF-123456" value={reference}
                    onChange={e => setReference(e.target.value)} required />
                </FormField>
                <FormField label="Comprobante (imagen/PDF)" required>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => setVoucherFile(e.target.files?.[0] ?? null)}
                    required
                    className="file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300 file:px-3 file:py-1.5 file:text-xs hover:file:bg-slate-600"
                  />
                </FormField>
                {voucherFile && (
                  <p className="text-xs text-emerald-400">✓ {voucherFile.name}</p>
                )}
              </form>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal(false)}>Cancelar</Button>
            <Button
              form={payMethod === 'card' ? 'card-form' : 'transfer-form'}
              type="submit"
              loading={loading || uploading}
              disabled={!orderId && pendingOrders.length === 0}
            >
              {payMethod === 'card' ? 'Pagar ahora' : uploading ? 'Subiendo…' : 'Enviar Comprobante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
