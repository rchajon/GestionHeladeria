'use client'

import { useState, useEffect } from 'react'
import type { Profile, Order } from '@/lib/database.types'
import { formatCurrency, formatDate, ORDER_STATUS_CONFIG } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { toggleClientStatus, updateClientProfile } from '@/actions/clients'
import { ClipboardList } from 'lucide-react'

interface ClientWithStats extends Profile {
  total_orders:  number
  total_spent:   number
  pending_debt:  number
  last_order_at: string | null
}

interface ClientsClientProps {
  clients:   ClientWithStats[]
  allOrders: Pick<Order, 'id' | 'client_id' | 'status' | 'total_amount' | 'created_at'>[]
}

const PAGE_SIZE = 10

export function ClientsClient({ clients: initialClients, allOrders }: ClientsClientProps) {
  const [clients, setClients]       = useState(initialClients)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [editModal, setEdit]        = useState<ClientWithStats | null>(null)
  const [detailModal, setDetail]    = useState<ClientWithStats | null>(null)
  const [historyClient, setHistory] = useState<ClientWithStats | null>(null)
  const [loading, setLoading]       = useState(false)
  const { show, ToastComponent }    = useToast()

  // Sync with server data after router.refresh()
  useEffect(() => { setClients(initialClients) }, [initialClients])

  const debouncedSearch = useDebounce(search, 250)

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (c.business_name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (c.email).toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleToggle(client: ClientWithStats) {
    const result = await toggleClientStatus(client.id, !client.is_active)
    if (!result.success) { show(result.error, 'error'); return }
    setClients(cs => cs.map(c => c.id === client.id ? { ...c, is_active: !c.is_active } : c))
    show(`Cliente ${client.is_active ? 'desactivado' : 'activado'}.`, 'success')
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editModal) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result   = await updateClientProfile(editModal.id, formData)
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }

    // Update local state immediately
    const updated = {
      ...editModal,
      full_name:     String(formData.get('full_name')     ?? editModal.full_name),
      business_name: String(formData.get('business_name') ?? editModal.business_name ?? '') || null,
      phone:         String(formData.get('phone')         ?? '') || null,
      tax_id:        String(formData.get('tax_id')        ?? '') || null,
      address:       String(formData.get('address')       ?? '') || null,
    }
    setClients(cs => cs.map(c => c.id === editModal.id ? updated : c))
    show('Datos del cliente actualizados.', 'success')
    setEdit(null)
  }

  return (
    <>
      {ToastComponent}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-slate-400 text-sm mt-0.5">{clients.length} revendedores registrados</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-bold text-white">{clients.filter(c => c.is_active).length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Clientes activos</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(clients.reduce((s, c) => s + c.total_spent, 0))}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Total facturado</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-bold text-amber-400">
              {formatCurrency(clients.reduce((s, c) => s + c.pending_debt, 0))}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Deuda pendiente total</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <SearchInput
              placeholder="Buscar por nombre, negocio o correo…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              containerClassName="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Cliente / Negocio</TableHead>
                <TableHead>NIT / RFC</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total Comprado</TableHead>
                <TableHead className="text-right">Deuda</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginated.length === 0
                ? <TableEmpty colSpan={7} message="No se encontraron clientes." />
                : paginated.map(client => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{client.business_name ?? client.full_name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{client.tax_id ?? '—'}</TableCell>
                    <TableCell className="text-right text-white">{client.total_orders}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">
                      {formatCurrency(client.total_spent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.pending_debt > 0
                        ? <span className="text-amber-400 font-semibold">{formatCurrency(client.pending_debt)}</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? 'success' : 'default'}>
                        {client.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setHistory(client)}>
                          <ClipboardList className="w-3.5 h-3.5" />
                          Pedidos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDetail(client)}>
                          Ver
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEdit(client)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={client.is_active ? 'destructive' : 'success'}
                          onClick={() => handleToggle(client)}
                        >
                          {client.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>

          <div className="border-t border-slate-800">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
              label="clientes"
            />
          </div>
        </div>
      </div>

      {/* Client Order History Modal */}
      <Dialog open={!!historyClient} onClose={() => setHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Historial de Pedidos</DialogTitle>
                {historyClient && <p className="text-xs text-slate-500 mt-0.5">{historyClient.business_name ?? historyClient.full_name}</p>}
              </div>
            </div>
          </DialogHeader>
          {historyClient && (() => {
            const clientOrders = allOrders.filter(o => o.client_id === historyClient.id)
            return (
              <DialogBody className="p-0">
                {clientOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">Este cliente no tiene pedidos aún.</div>
                ) : (
                  <>
                    <div className="px-6 py-3 border-b border-slate-800 flex justify-between text-xs text-slate-500">
                      <span>{clientOrders.length} pedidos en total</span>
                      <span className="text-emerald-400 font-semibold">
                        Total: {formatCurrency(clientOrders.filter(o => ['paid','in_delivery','delivered'].includes(o.status)).reduce((s, o) => s + o.total_amount, 0))}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <tr>
                            <TableHead>ID</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Fecha</TableHead>
                          </tr>
                        </TableHeader>
                        <TableBody>
                          {clientOrders.map(o => {
                            const sc = ORDER_STATUS_CONFIG[o.status as keyof typeof ORDER_STATUS_CONFIG]
                            return (
                              <TableRow key={o.id}>
                                <TableCell className="font-mono text-xs text-slate-500">{o.id.slice(0, 8)}…</TableCell>
                                <TableCell><Badge className={sc?.color ?? ''}>{sc?.label ?? o.status}</Badge></TableCell>
                                <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(o.total_amount)}</TableCell>
                                <TableCell className="text-slate-400 text-xs">{formatDate(o.created_at)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </DialogBody>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistory(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailModal} onClose={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ficha de Cliente</DialogTitle>
          </DialogHeader>
          {detailModal && (
            <DialogBody className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                  {(detailModal.business_name ?? detailModal.full_name)[0]}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{detailModal.business_name ?? detailModal.full_name}</p>
                  <p className="text-sm text-slate-400">{detailModal.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nombre completo', value: detailModal.full_name },
                  { label: 'Teléfono',        value: detailModal.phone    ?? '—' },
                  { label: 'NIT / RFC',        value: detailModal.tax_id  ?? '—' },
                  { label: 'Dirección',        value: detailModal.address ?? '—' },
                ].map(f => (
                  <div key={f.label} className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{f.label}</p>
                    <p className="text-sm text-white mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pedidos',       value: String(detailModal.total_orders), color: 'text-white' },
                  { label: 'Total comprado', value: formatCurrency(detailModal.total_spent), color: 'text-emerald-400' },
                  { label: 'Deuda',         value: formatCurrency(detailModal.pending_debt), color: detailModal.pending_debt > 0 ? 'text-amber-400' : 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 text-center">
                Registrado: {formatDate(detailModal.created_at)}
              </p>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editModal} onClose={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editModal && (
          <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
              <DialogBody className="space-y-3">
                <FormField label="Nombre completo" required>
                  <Input name="full_name" defaultValue={editModal.full_name} required />
                </FormField>
                <FormField label="Nombre del negocio" required>
                  <Input name="business_name" defaultValue={editModal.business_name ?? ''} required />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Teléfono">
                    <Input name="phone" defaultValue={editModal.phone ?? ''} />
                  </FormField>
                  <FormField label="NIT / RFC">
                    <Input name="tax_id" defaultValue={editModal.tax_id ?? ''} />
                  </FormField>
                </div>
                <FormField label="Dirección">
                  <Input name="address" defaultValue={editModal.address ?? ''} />
                </FormField>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button type="submit" loading={loading}>Guardar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
