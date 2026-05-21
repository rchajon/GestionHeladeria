'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Product, ProductionRecord } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { registerProduction } from '@/actions/production'
import { Factory, Plus, TrendingUp } from 'lucide-react'

interface ProductionRow extends ProductionRecord { product_name?: string; creator_name?: string }

interface ProductionClientProps {
  records:  ProductionRow[]
  products: Product[]
}

const PAGE_SIZE = 15

export function ProductionClient({ records: initialRecords, products }: ProductionClientProps) {
  const router = useRouter()
  const [records, setRecords]           = useState(initialRecords)
  const [open, setOpen]                 = useState(false)
  const [loading, setLoading]           = useState(false)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [productId, setProductId]       = useState(products[0]?.id ?? '')
  const [quantity, setQuantity]         = useState('')
  const [batchNotes, setBatchNotes]     = useState('')
  const [producedAt, setProducedAt]     = useState(new Date().toISOString().slice(0, 10))

  // Sync with server data after router.refresh()
  useEffect(() => { setRecords(initialRecords) }, [initialRecords])
  const { show, ToastComponent }        = useToast()

  const debouncedSearch = useDebounce(search, 250)

  const today      = new Date().toISOString().slice(0, 10)
  const todayRecs  = records.filter(r => r.produced_at.slice(0, 10) === today)
  const todayTotal = todayRecs.reduce((s, r) => s + r.quantity, 0)

  // ── Totals per product this month ──────────────────────────────────────
  const now = new Date()
  const thisMonthRecs = records.filter(r => {
    const d = new Date(r.produced_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const productTotals = thisMonthRecs.reduce<Record<string, { name: string; total: number }>>((acc, r) => {
    const name = r.product_name ?? '—'
    if (!acc[r.product_id]) acc[r.product_id] = { name, total: 0 }
    acc[r.product_id].total += r.quantity
    return acc
  }, {})
  const topProducts = Object.values(productTotals).sort((a, b) => b.total - a.total).slice(0, 6)

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    const matchSearch = debouncedSearch === '' ||
      (r.product_name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (r.batch_notes ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (r.creator_name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchProduct = productFilter === 'all' || r.product_id === productFilter
    return matchSearch && matchProduct
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Submit — optimistic update ─────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !quantity) { show('Completa todos los campos.', 'error'); return }
    setLoading(true)
    const result = await registerProduction({
      product_id:  productId,
      quantity:    parseInt(quantity, 10),
      batch_notes: batchNotes || undefined,
      produced_at: producedAt,
    })
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }

    // Optimistic update — add new record to local state immediately
    const selectedProduct = products.find(p => p.id === productId)
    const newRecord: ProductionRow = {
      id:           result.data.production_id,
      product_id:   productId,
      quantity:     parseInt(quantity, 10),
      batch_notes:  batchNotes || null,
      produced_at:  producedAt,
      created_by:   '',
      created_at:   new Date().toISOString(),
      product_name: selectedProduct?.name,
    }
    setRecords(prev => [newRecord, ...prev])

    show('Producción registrada. Inventario actualizado.', 'success')
    setOpen(false)
    setQuantity('')
    setBatchNotes('')
    // Background refresh to get server-generated data
    router.refresh()
  }

  return (
    <>
      {ToastComponent}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Producción</h1>
            <p className="text-slate-400 text-sm mt-0.5">Registro de lotes y producción diaria</p>
          </div>
          <Button id="btn-register-production" onClick={() => setOpen(true)} className="whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Registrar Producción
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Lotes hoy',       value: todayRecs.length, color: 'cyan'    },
            { label: 'Unidades hoy',    value: todayTotal,       color: 'emerald' },
            { label: 'Total registros', value: records.length,   color: 'slate'   },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-500/5 border border-${s.color}-500/20 rounded-2xl p-4 text-center`}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top products this month */}
        {topProducts.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Producción este mes por sabor</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {topProducts.map(p => (
                <div key={p.name} className="bg-slate-800/60 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-slate-400 truncate mb-1">{p.name}</p>
                  <p className="text-emerald-400 font-bold text-sm">+{p.total}</p>
                  <p className="text-xs text-slate-600">uds</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white">Historial de Producción</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
              </div>
              <div className="flex gap-2">
                <SearchInput
                  placeholder="Buscar producto, notas…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  containerClassName="w-48"
                />
                <Select
                  value={productFilter}
                  onChange={e => { setProductFilter(e.target.value); setPage(1) }}
                  className="h-10 w-44"
                >
                  <option value="all">Todos los sabores</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Notas de lote</TableHead>
                <TableHead>Registrado por</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginated.length === 0
                ? <TableEmpty colSpan={5} message="Sin registros de producción." />
                : paginated.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-slate-400 text-xs whitespace-nowrap">{formatDate(r.produced_at)}</TableCell>
                    <TableCell className="text-white font-medium">{r.product_name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-emerald-400 font-bold">+{r.quantity}</span>
                      <span className="text-slate-500 text-xs ml-1">uds</span>
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{r.batch_notes ?? '—'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{r.creator_name ?? '—'}</TableCell>
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
              label="registros"
            />
          </div>
        </div>
      </div>

      {/* Register modal */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Factory className="w-5 h-5" />
              </div>
              <DialogTitle>Registrar Producción</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4">
              <FormField label="Producto" required>
                <Select value={productId} onChange={e => setProductId(e.target.value)} required>
                  <option value="">— Selecciona un sabor —</option>
                  {products.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock: {p.stock})
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cantidad producida" required>
                  <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" required />
                </FormField>
                <FormField label="Fecha de producción" required>
                  <Input type="date" value={producedAt} onChange={e => setProducedAt(e.target.value)} required />
                </FormField>
              </div>
              <FormField label="Notas del lote">
                <Input value={batchNotes} onChange={e => setBatchNotes(e.target.value)} placeholder="Ej: Lote #42, sabor reforzado…" />
              </FormField>

              {/* Preview */}
              {productId && quantity && (() => {
                const p = products.find(x => x.id === productId)
                if (!p) return null
                const qty = parseInt(quantity) || 0
                return (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-medium">✓ Stock resultante:</span>
                      <span className="text-white font-bold">{p.stock} → {p.stock + qty}</span>
                    </div>
                  </div>
                )
              })()}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
