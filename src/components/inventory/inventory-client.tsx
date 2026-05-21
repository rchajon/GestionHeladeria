'use client'

import { useState } from 'react'
import type { Product, InventoryMovement } from '@/lib/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { addInventoryAdjustment } from '@/actions/inventory'
import { TrendingUp, TrendingDown, Sliders, Plus, History, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface MovementRow extends InventoryMovement {
  product_name?: string
  creator_name?: string
}

interface InventoryClientProps {
  products:  Product[]
  movements: MovementRow[]
}

const PAGE_SIZE = 20

// ─── Movement type config ─────────────────────────────────────────────────────
const MOV_CONFIG = {
  in:         { label: '↑ Entrada',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', icon: TrendingUp,   sign: '+' },
  out:        { label: '↓ Salida',   color: 'text-rose-400',    bg: 'bg-rose-500/10 text-rose-400',       icon: TrendingDown, sign: '-' },
  adjustment: { label: '⟳ Ajuste',   color: 'text-slate-300',   bg: 'bg-slate-500/10 text-slate-400',     icon: Sliders,      sign: '→' },
}

// ─── Reference type labels ────────────────────────────────────────────────────
const REF_LABELS: Record<string, string> = {
  order:              'Pedido',
  order_cancellation: 'Cancelación',
  production:         'Producción',
  manual_adjustment:  'Ajuste manual',
}

export function InventoryClient({ products, movements }: InventoryClientProps) {
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('all')
  const [page, setPage]           = useState(1)
  const [adjustOpen, setAdjust]   = useState(false)
  const [adjProduct, setAdjProd]  = useState('')
  const [adjType, setAdjType]     = useState<'in' | 'out' | 'adjustment'>('in')
  const [adjQty, setAdjQty]       = useState('')
  const [adjNotes, setAdjNotes]   = useState('')
  const [loading, setLoading]     = useState(false)
  const { show, ToastComponent }  = useToast()

  const lowStock   = products.filter(p => p.stock <= p.min_stock && p.is_active)
  const noStock    = products.filter(p => p.stock === 0 && p.is_active)

  // ── Filter movements ───────────────────────────────────────────────────────
  const filtered = movements.filter(m => {
    const q = search.toLowerCase()
    const matchSearch =
      (m.product_name ?? '').toLowerCase().includes(q) ||
      (m.notes ?? '').toLowerCase().includes(q) ||
      (m.reference_type ?? '').toLowerCase().includes(q) ||
      (m.creator_name ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || m.movement_type === typeFilter
    return matchSearch && matchType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalEntradas = movements.filter(m => m.movement_type === 'in').reduce((s, m) => s + m.quantity, 0)
  const totalSalidas  = movements.filter(m => m.movement_type === 'out').reduce((s, m) => s + m.quantity, 0)

  // ── Submit adjustment ─────────────────────────────────────────────────────
  async function handleAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const result = await addInventoryAdjustment(new FormData(e.currentTarget))
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }
    show('Movimiento registrado correctamente.', 'success')
    setAdjust(false)
    setAdjQty('')
    setAdjNotes('')
  }

  return (
    <>
      {ToastComponent}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Inventario</h1>
            <p className="text-slate-400 text-sm mt-0.5">{products.length} productos · {movements.length} movimientos registrados</p>
          </div>
          <Button onClick={() => { setAdjust(true); setAdjProd(products[0]?.id ?? '') }}>
            <Plus className="w-4 h-4" />
            Ajuste Manual
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Productos totales',     value: products.length,    color: 'cyan',    icon: '📦' },
            { label: 'Stock bajo / sin stock', value: lowStock.length,    color: 'amber',   icon: '⚠' },
            { label: 'Total entradas',         value: totalEntradas,      color: 'emerald', icon: '↑' },
            { label: 'Total salidas',          value: totalSalidas,       color: 'rose',    icon: '↓' },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-500/5 border border-${s.color}-500/20 rounded-2xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl bg-${s.color}-500/20 flex items-center justify-center text-base shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className={`text-xs text-${s.color}-400`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <p className="text-sm font-semibold text-rose-400">
                {noStock.length} sin stock · {lowStock.length - noStock.length} stock bajo
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {lowStock.map(p => (
                <div key={p.id} className="bg-slate-900 rounded-xl px-3 py-2 border border-slate-800">
                  <p className="text-xs text-white font-medium truncate">{p.name}</p>
                  <p className={`font-bold text-sm ${p.stock === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {p.stock} <span className="text-slate-500 font-normal text-xs">/ mín {p.min_stock}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Stock Actual por Producto</h2>
            <span className="text-xs text-slate-500">{products.length} productos</span>
          </div>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Producto</TableHead>
                <TableHead>Sabor</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {products.length === 0
                ? <TableEmpty colSpan={6} />
                : products.map(p => {
                  const isLow      = p.stock <= p.min_stock && p.stock > 0
                  const isCritical = p.stock === 0
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.unit_label}</p>
                      </TableCell>
                      <TableCell className="text-slate-400">{p.flavor}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold text-base ${isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-white'}`}>
                          {p.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">{p.min_stock}</TableCell>
                      <TableCell className="text-right text-emerald-400 font-medium">{formatCurrency(p.price_per_unit)}</TableCell>
                      <TableCell>
                        {isCritical
                          ? <Badge variant="danger">Sin stock</Badge>
                          : isLow
                            ? <Badge variant="pending">Stock bajo</Badge>
                            : <Badge variant="success">OK</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>
        </div>

        {/* Movements history */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white">Historial de Movimientos</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <SearchInput
                  placeholder="Buscar producto, nota…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  containerClassName="w-52"
                />
                <Select
                  value={typeFilter}
                  onChange={e => { setType(e.target.value); setPage(1) }}
                  className="h-10 w-36"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="in">↑ Entradas</option>
                  <option value="out">↓ Salidas</option>
                  <option value="adjustment">⟳ Ajustes</option>
                </Select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <tr>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Antes</TableHead>
                <TableHead className="text-right">Después</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Notas</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginated.length === 0
                ? (
                  <TableEmpty colSpan={8} message={
                    movements.length === 0
                      ? 'Sin movimientos registrados. Los movimientos se crean automáticamente con pedidos y producción, o manualmente con "Ajuste Manual".'
                      : 'No hay movimientos con esos filtros.'
                  } />
                )
                : paginated.map(m => {
                  const cfg = MOV_CONFIG[m.movement_type]
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-slate-500 text-xs whitespace-nowrap">{formatDate(m.created_at)}</TableCell>
                      <TableCell>
                        <p className="text-white text-sm font-medium">{m.product_name ?? '—'}</p>
                        {m.creator_name && <p className="text-xs text-slate-600">por {m.creator_name}</p>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${cfg.color}`}>
                        {cfg.sign}{m.quantity}
                      </TableCell>
                      <TableCell className="text-right text-slate-400 text-sm">{m.stock_before}</TableCell>
                      <TableCell className="text-right text-white font-semibold text-sm">{m.stock_after}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {REF_LABELS[m.reference_type ?? ''] ?? (m.reference_type ?? '—')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[180px] truncate" title={m.notes ?? ''}>
                        {m.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="border-t border-slate-800">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPage={setPage}
                label="movimientos"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Ajuste Manual Modal ── */}
      <Dialog open={adjustOpen} onClose={() => setAdjust(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <DialogTitle>Ajuste Manual de Stock</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={handleAdjust}>
            <DialogBody className="space-y-4">
              <FormField label="Producto">
                <Select name="product_id" value={adjProduct} onChange={e => setAdjProd(e.target.value)} required>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actual: {p.stock})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Tipo de movimiento">
                <Select
                  name="movement_type"
                  value={adjType}
                  onChange={e => setAdjType(e.target.value as 'in' | 'out' | 'adjustment')}
                  required
                >
                  <option value="in">↑ Entrada (agregar unidades)</option>
                  <option value="out">↓ Salida (restar unidades)</option>
                  <option value="adjustment">⟳ Ajuste (establecer cantidad exacta)</option>
                </Select>
              </FormField>

              <FormField label={adjType === 'adjustment' ? 'Nueva cantidad total' : 'Cantidad'}>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                  required
                  placeholder={adjType === 'adjustment' ? 'Ej: 25' : 'Ej: 10'}
                  style={{ padding: '10px 14px' }}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/50 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </FormField>

              <FormField label="Notas (opcional)">
                <input
                  name="notes"
                  type="text"
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  placeholder="Ej: Conteo físico, merma, devolución…"
                  maxLength={300}
                  style={{ padding: '10px 14px' }}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/50 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </FormField>

              {/* Preview en tiempo real */}
              {adjProduct && adjQty && (() => {
                const p   = products.find(x => x.id === adjProduct)
                if (!p) return null
                const qty   = parseInt(adjQty) || 0
                const after =
                  adjType === 'in'         ? p.stock + qty :
                  adjType === 'out'        ? p.stock - qty :
                  qty  // adjustment = set exact

                const isNegative   = after < 0
                const isBelowMin   = after >= 0 && after <= p.min_stock
                const isOk         = after > p.min_stock

                const operationText =
                  adjType === 'in'         ? `+${qty} unidades` :
                  adjType === 'out'        ? `-${qty} unidades` :
                  `= ${qty} unidades (valor exacto)`

                return (
                  <div className={[
                    'rounded-xl border p-4 space-y-3 transition-all',
                    isNegative  ? 'bg-rose-500/5 border-rose-500/30'   :
                    isBelowMin  ? 'bg-amber-500/5 border-amber-500/30' :
                    'bg-emerald-500/5 border-emerald-500/20',
                  ].join(' ')}>
                    {/* Stock before → after */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Resultado</span>
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-slate-500">{p.stock}</span>
                        <span className="text-slate-600">→</span>
                        <span className={`font-bold text-base ${
                          isNegative ? 'text-rose-400' : isBelowMin ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {after}
                        </span>
                        <span className="text-slate-600 text-xs">uds</span>
                        {isNegative  && <span title="Quedará en negativo">❌</span>}
                        {isBelowMin  && !isNegative && <span title="Bajo el mínimo">⚠️</span>}
                        {isOk        && <span title="Stock saludable">✅</span>}
                      </div>
                    </div>

                    {/* Operación */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Operación</span>
                      <span className="text-slate-300 font-medium">{operationText}</span>
                    </div>

                    {/* Warnings */}
                    {isNegative && (
                      <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">
                        <span>❌</span>
                        <span>El stock <strong>quedará en negativo</strong>. Verifica la cantidad.</span>
                      </div>
                    )}
                    {isBelowMin && !isNegative && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                        <span>⚠️</span>
                        <span>Quedará <strong>bajo el mínimo</strong> ({p.min_stock} uds). Considera producir más.</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjust(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Registrar Movimiento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
