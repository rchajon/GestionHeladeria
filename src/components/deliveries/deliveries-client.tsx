'use client'

import { useState, useEffect } from 'react'
import type { Order } from '@/lib/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { updateOrderStatus } from '@/actions/orders'
import { Truck, CheckCircle2, Clock, Package, MapPin, History, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeliveryOrder extends Order { client_name: string }

interface DeliveryEvent {
  id:         string
  order_id:   string
  status:     'in_delivery' | 'delivered'
  notes:      string | null
  changed_by: string | null
  created_at: string
  admin_name?: string
}

interface DeliveriesClientProps {
  orders:         DeliveryOrder[]
  history:        DeliveryOrder[]        // delivered orders for history panel
  deliveryEvents: DeliveryEvent[]        // all events for timeline
}

// ─── Status tracker steps ─────────────────────────────────────────────────────
const TRACKER_STEPS = [
  { status: 'paid',        label: 'Pago confirmado',   icon: CheckCircle2 },
  { status: 'in_delivery', label: 'En tránsito',        icon: Truck        },
  { status: 'delivered',   label: 'Entregado',          icon: MapPin       },
]

function StatusTracker({ status }: { status: string }) {
  const currentIdx = TRACKER_STEPS.findIndex(s => s.status === status)
  return (
    <div className="flex items-center gap-0">
      {TRACKER_STEPS.map((step, idx) => {
        const Icon      = step.icon
        const isPast    = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture  = idx > currentIdx
        return (
          <div key={step.status} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                isPast    ? 'bg-emerald-500/20 text-emerald-400'  : '',
                isCurrent ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500/40' : '',
                isFuture  ? 'bg-slate-800 text-slate-600'          : '',
              ].filter(Boolean).join(' ')}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap ${
                isCurrent ? 'text-cyan-400' : isPast ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < TRACKER_STEPS.length - 1 && (
              <div className={`w-10 h-px mb-5 transition-all ${
                idx < currentIdx ? 'bg-emerald-500/50' : 'bg-slate-700'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Order row with tracker ───────────────────────────────────────────────────
function DeliveryRow({
  order,
  loading,
  onAction,
}: {
  order:    DeliveryOrder
  loading:  string | null
  onAction: (id: string, status: 'in_delivery' | 'delivered') => void
}) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-slate-500">{order.id.slice(0, 8)}…</TableCell>
      <TableCell className="text-white font-medium">{order.client_name}</TableCell>
      <TableCell className="text-slate-400 text-xs">
        {order.delivery_date ? formatDate(order.delivery_date) : '—'}
      </TableCell>
      <TableCell>
        <StatusTracker status={order.status} />
      </TableCell>
      <TableCell className="text-right text-emerald-400 font-semibold">
        {formatCurrency(order.total_amount)}
      </TableCell>
      <TableCell className="text-right">
        {order.status === 'paid' && (
          <Button
            size="sm"
            variant="outline"
            loading={loading === order.id}
            onClick={() => onAction(order.id, 'in_delivery')}
          >
            <Truck className="w-3.5 h-3.5" />
            Enviar
          </Button>
        )}
        {order.status === 'in_delivery' && (
          <Button
            size="sm"
            variant="success"
            loading={loading === order.id}
            onClick={() => onAction(order.id, 'delivered')}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmar
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DeliveriesClient({ orders: initialOrders, history, deliveryEvents }: DeliveriesClientProps) {
  const [orders, setOrders]         = useState(initialOrders)
  const [loading, setLoading]       = useState<string | null>(null)
  const [historyOpen, setHistory]   = useState(false)
  const [noteModal, setNoteModal]   = useState<{ orderId: string; status: 'in_delivery' | 'delivered' } | null>(null)
  const [noteText, setNoteText]     = useState('')
  const { show, ToastComponent }    = useToast()

  // Sync with server data after router.refresh()
  useEffect(() => { setOrders(initialOrders) }, [initialOrders])

  const pending = orders.filter(o => o.status === 'paid')
  const enroute = orders.filter(o => o.status === 'in_delivery')

  async function handle(orderId: string, newStatus: 'in_delivery' | 'delivered') {
    // For 'delivered', prompt for optional notes
    if (newStatus === 'delivered') {
      setNoteModal({ orderId, status: newStatus })
      return
    }
    await executeStatusChange(orderId, newStatus, '')
  }

  async function executeStatusChange(orderId: string, newStatus: 'in_delivery' | 'delivered', notes: string) {
    setLoading(orderId)
    const result = await updateOrderStatus(orderId, newStatus)
    setLoading(null)
    if (!result.success) { show(result.error, 'error'); return }

    if (newStatus === 'delivered') {
      setOrders(os => os.filter(o => o.id !== orderId))
      show('✓ Entrega confirmada y registrada en historial', 'success')
    } else {
      setOrders(os => os.map(o => o.id === orderId ? { ...o, status: 'in_delivery' } : o))
      show('🚚 Pedido marcado como en camino', 'info')
    }
  }

  // Events for a specific order
  function eventsForOrder(orderId: string) {
    return deliveryEvents.filter(e => e.order_id === orderId).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return (
    <>
      {ToastComponent}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Entregas</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {pending.length} listos para enviar · {enroute.length} en tránsito
            </p>
          </div>
          <Button variant="outline" onClick={() => setHistory(true)}>
            <History className="w-4 h-4" />
            Historial ({history.length})
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Listos para enviar', value: pending.length,  color: 'emerald', icon: '✓'   },
            { label: 'En tránsito',        value: enroute.length,  color: 'blue',    icon: '🚚'  },
            { label: 'Entregados (total)', value: history.length,  color: 'cyan',    icon: '📦'  },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-500/5 border border-${s.color}-500/20 rounded-2xl p-4 flex items-center gap-4`}>
              <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/20 flex items-center justify-center text-xl shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className={`text-xs text-${s.color}-400`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Listos para enviar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white">Listos para Enviar</h2>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha entrega</TableHead>
                <TableHead>Tracker</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pending.length === 0
                ? <TableEmpty colSpan={6} message="No hay pedidos listos para envío." />
                : pending.map(o => (
                  <DeliveryRow key={o.id} order={o} loading={loading} onAction={handle} />
                ))
              }
            </TableBody>
          </Table>
        </div>

        {/* En tránsito */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white">En Tránsito</h2>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{enroute.length}</span>
          </div>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha entrega</TableHead>
                <TableHead>Tracker</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {enroute.length === 0
                ? <TableEmpty colSpan={6} message="No hay pedidos en camino." />
                : enroute.map(o => (
                  <DeliveryRow key={o.id} order={o} loading={loading} onAction={handle} />
                ))
              }
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Historial Modal ── */}
      <Dialog open={historyOpen} onClose={() => setHistory(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <DialogTitle>Historial de Entregas</DialogTitle>
              <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{history.length} entregas</span>
            </div>
          </DialogHeader>
          <DialogBody className="p-0">
            {history.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                <Package className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                Aún no hay entregas completadas
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {history.map(order => {
                  const events = eventsForOrder(order.id)
                  return (
                    <div key={order.id} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-slate-500">{order.id.slice(0, 8)}…</span>
                            <Badge variant="success">Entregado</Badge>
                          </div>
                          <p className="text-white font-medium">{order.client_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Entrega: {order.delivery_date ? formatDate(order.delivery_date) : '—'} ·
                            Actualizado: {formatDate(order.updated_at)}
                          </p>

                          {/* Timeline de eventos */}
                          {events.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {events.map(ev => (
                                <div key={ev.id} className="flex items-center gap-2 text-xs">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    ev.status === 'delivered' ? 'bg-emerald-400' : 'bg-blue-400'
                                  }`} />
                                  <span className={ev.status === 'delivered' ? 'text-emerald-400' : 'text-blue-400'}>
                                    {ev.status === 'delivered' ? 'Entregado' : 'Enviado'}
                                  </span>
                                  <span className="text-slate-600">—</span>
                                  <span className="text-slate-500">{ev.notes ?? ''}</span>
                                  <span className="text-slate-700 ml-auto">{formatDate(ev.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-emerald-400 font-bold">{formatCurrency(order.total_amount)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
      {/* ── Confirm Delivery Notes Modal ── */}
      {noteModal && (
        <Dialog open={!!noteModal} onClose={() => { setNoteModal(null); setNoteText('') }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <DialogTitle>Confirmar Entrega</DialogTitle>
              </div>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <p className="text-sm text-slate-400">¿Confirmar que este pedido fue entregado exitosamente?</p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notas de entrega (opcional)</label>
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ej: Entregado en puerta, firmado por recepcionista…"
                  maxLength={300}
                  style={{ padding: '10px 14px' }}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/50 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </DialogBody>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => { setNoteModal(null); setNoteText('') }}>Cancelar</Button>
              <Button
                variant="success"
                loading={loading === noteModal.orderId}
                onClick={async () => {
                  const { orderId, status } = noteModal!
                  setNoteModal(null)
                  await executeStatusChange(orderId, status, noteText)
                  setNoteText('')
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Entrega
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
