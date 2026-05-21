'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Order, Product, Profile } from '@/lib/database.types'
import { formatCurrency, formatDate, ORDER_STATUS_CONFIG } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { createOrder, cancelOrder, updateOrderStatus } from '@/actions/orders'
import type { OrderStatus } from '@/lib/database.types'
import { Package, Plus, Search, ShoppingCart, ChevronRight, Eye } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'

interface OrderItemRow {
  id:             string
  order_id:       string
  product_id:     string
  quantity:       number
  unit_price:     number
  subtotal:       number
  product_name:   string
  product_flavor: string
}

interface OrderRow extends Order {
  profile?: Pick<Profile, 'full_name' | 'business_name'>
  items?:   OrderItemRow[]
}

interface CartItem {
  product:  Product
  quantity: number
}

interface OrdersClientProps {
  initialOrders: OrderRow[]
  products:      Product[]
  clientId:      string
  isAdmin:       boolean
}

const PAGE_SIZE = 10

// ── Step types for the create order wizard ──────────────────────────────
type WizardStep = 'products' | 'details'

export function OrdersClient({ initialOrders, products, clientId, isAdmin }: OrdersClientProps) {
  const router = useRouter()

  const [orders, setOrders]         = useState(initialOrders)
  const [search, setSearch]         = useState('')
  const [statusFilter, setFilter]   = useState<string>('all')
  const [sortUrgency, setSortUrgency] = useState(false)
  const [page, setPage]             = useState(1)
  const [detailOrder, setDetail]    = useState<OrderRow | null>(null)

  // Sync with server data after router.refresh()
  useEffect(() => { setOrders(initialOrders) }, [initialOrders])

  // Create order wizard — restore cart from sessionStorage
  const [createOpen, setCreateOpen]   = useState(false)
  const [wizardStep, setWizardStep]   = useState<WizardStep>('products')
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart]               = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('order_cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [notes, setNotes]             = useState('')
  const [deliveryDate, setDelivery]   = useState('')
  const [loading, setLoading]         = useState(false)

  const debouncedProductSearch = useDebounce(productSearch, 200)

  // Confirm cancel dialog
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const { show, ToastComponent } = useToast()

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchSearch = o.id.includes(search) ||
      (o.profile?.business_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  // Sort by urgency: active orders with nearest delivery_date first, no date last
  const sorted = sortUrgency
    ? [...filtered].sort((a, b) => {
        const aActive = !['delivered', 'cancelled'].includes(a.status)
        const bActive = !['delivered', 'cancelled'].includes(b.status)
        if (aActive !== bActive) return aActive ? -1 : 1
        if (!a.delivery_date && !b.delivery_date) return 0
        if (!a.delivery_date) return 1
        if (!b.delivery_date) return -1
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
      })
    : filtered

  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Cart management ────────────────────────────────────────────────────
  function updateCart(updater: (prev: CartItem[]) => CartItem[]) {
    setCart(prev => {
      const next = updater(prev)
      try { sessionStorage.setItem('order_cart', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function addToCart(product: Product) {
    updateCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQty(productId: string, qty: number) {
    updateCart(prev =>
      qty <= 0
        ? prev.filter(i => i.product.id !== productId)
        : prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)
    )
  }

  const cartTotal = cart.reduce((s, i) => s + i.product.price_per_unit * i.quantity, 0)

  // Show ALL active products — out-of-stock ones shown as disabled
  const visibleProducts = products
    .filter(p => p.is_active)
    .filter(p =>
      debouncedProductSearch === '' ||
      p.name.toLowerCase().includes(debouncedProductSearch.toLowerCase()) ||
      p.flavor.toLowerCase().includes(debouncedProductSearch.toLowerCase())
    )

  function openCreate() {
    setNotes('')
    setDelivery('')
    setProductSearch('')
    setWizardStep('products')
    setCreateOpen(true)
    // Don't clear cart — restore from sessionStorage
  }

  // ── Create order ───────────────────────────────────────────────────────
  async function handleCreateOrder() {
    if (cart.length === 0) { show('Agrega al menos un producto.', 'error'); return }
    setLoading(true)
    const result = await createOrder({
      client_id:     clientId,
      notes:         notes || undefined,
      delivery_date: deliveryDate || undefined,
      items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price_per_unit })),
    })
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }
    show('Pedido creado exitosamente.', 'success')
    setCreateOpen(false)
    updateCart(() => [])  // clear cart
    router.refresh()
  }

  // ── Cancel order ───────────────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelTarget) return
    const result = await cancelOrder(cancelTarget)
    setCancelTarget(null)
    if (!result.success) { show(result.error, 'error'); return }
    setOrders(os => os.map(o => o.id === cancelTarget ? { ...o, status: 'cancelled' } : o))
    show('Pedido cancelado.', 'success')
  }

  // ── Update status (admin) ──────────────────────────────────────────────
  async function handleStatus(orderId: string, newStatus: OrderStatus) {
    const result = await updateOrderStatus(orderId, newStatus)
    if (!result.success) { show(result.error, 'error'); return }
    setOrders(os => os.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    show('Estado actualizado.', 'success')
  }

  const statusConfig = ORDER_STATUS_CONFIG

  return (
    <>
      {ToastComponent}

      {/* Confirm cancel dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="¿Cancelar este pedido?"
        description="Esta acción no se puede deshacer. El pedido pasará al estado cancelado."
        confirmLabel="Sí, cancelar pedido"
        variant="destructive"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-slate-400 text-sm mt-0.5">{orders.length} pedidos en total</p>
        </div>
        <Button id="btn-create-order" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          id="search-orders"
          placeholder="Buscar por ID o cliente…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          containerClassName="max-w-xs"
        />
        <Select id="filter-status" value={statusFilter} onChange={e => { setFilter(e.target.value); setPage(1) }} className="w-48">
          <option value="all">Todos los estados</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <button
          onClick={() => { setSortUrgency(s => !s); setPage(1) }}
          className={[
            'flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-medium transition-all',
            sortUrgency
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white',
          ].join(' ')}
          title="Ordenar por urgencia de entrega"
        >
          🗓️ Ordenar por entrega
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>ID</TableHead>
              {isAdmin && <TableHead>Cliente</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && orders.length === 0
              ? (
                <TableEmptyState
                  colSpan={isAdmin ? 7 : 6}
                  icon={<Package className="w-6 h-6" />}
                  title="Aún no hay pedidos"
                  description="Crea tu primer pedido seleccionando productos del catálogo disponible."
                  action={
                    <button
                      onClick={openCreate}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors"
                    >
                      + Crear primer pedido
                    </button>
                  }
                />
              )
              : filtered.length === 0
                ? (
                  <TableEmptyState
                    colSpan={isAdmin ? 7 : 6}
                    icon={<Search className="w-5 h-5" />}
                    title="Sin resultados"
                    description="No se encontraron pedidos con esos filtros."
                  />
                )
                : paginated.map(order => {
                  const sc = statusConfig[order.status]
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <button
                          className="font-mono text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                          title={`Copiar ID: ${order.id}`}
                          onClick={() => {
                            navigator.clipboard.writeText(order.id)
                            show('ID copiado al portapapeles', 'info')
                          }}
                        >
                          {order.id.slice(0, 8)}…
                        </button>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <p className="text-white text-sm">{order.profile?.business_name ?? order.profile?.full_name ?? '—'}</p>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={sc.color}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        {(() => {
                          if (!order.delivery_date) return <span className="text-slate-600 text-xs">—</span>
                          const dDate    = new Date(order.delivery_date)
                          const today    = new Date(); today.setHours(0,0,0,0)
                          const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / 86400000)
                          const isActive = !['delivered', 'cancelled'].includes(order.status)

                          if (!isActive) {
                            return <span className="text-slate-500 text-xs">{formatDate(order.delivery_date)}</span>
                          }
                          if (diffDays < 0) return (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                              ⚠️ Vencido
                            </span>
                          )
                          if (diffDays === 0) return (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                              🔴 Hoy
                            </span>
                          )
                          if (diffDays === 1) return (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              🟡 Mañana
                            </span>
                          )
                          if (diffDays <= 3) return (
                            <span className="text-xs text-amber-400">{formatDate(order.delivery_date)}</span>
                          )
                          return <span className="text-xs text-slate-400">{formatDate(order.delivery_date)}</span>
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Ver detalle — always visible */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetail(order)}
                            title="Ver detalle del pedido"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </Button>
                          {order.status === 'awaiting_payment' && (
                            <a href={`/dashboard/payments?order_id=${order.id}&amount=${order.total_amount}`}>
                              <Button size="sm" variant="success">Pagar</Button>
                            </a>
                          )}
                          {isAdmin && order.status === 'paid' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatus(order.id, 'in_delivery')}>
                              Enviar
                            </Button>
                          )}
                          {isAdmin && order.status === 'in_delivery' && (
                            <Button size="sm" variant="success" onClick={() => handleStatus(order.id, 'delivered')}>
                              Entregado
                            </Button>
                          )}
                          {['pending', 'awaiting_payment'].includes(order.status) && (
                            <Button size="sm" variant="destructive" onClick={() => setCancelTarget(order.id)}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
            }
          </TableBody>
        </Table>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          label="pedidos"
        />
      </div>

      {/* ── Order Detail Modal ── */}
      <Dialog open={!!detailOrder} onClose={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Detalle del Pedido</DialogTitle>
                {detailOrder && (
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{detailOrder.id.slice(0, 8)}…</p>
                )}
              </div>
            </div>
          </DialogHeader>

          {detailOrder && (
            <DialogBody className="space-y-4">
              {/* Status + client */}
              <div className="flex items-center justify-between">
                <div>
                  {isAdmin && detailOrder.profile && (
                    <p className="text-white font-semibold">
                      {detailOrder.profile.business_name ?? detailOrder.profile.full_name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Pedido: {formatDate(detailOrder.created_at)}
                    {detailOrder.delivery_date && (
                      <> · Entrega: {formatDate(detailOrder.delivery_date)}</>
                    )}
                  </p>
                </div>
                <Badge className={ORDER_STATUS_CONFIG[detailOrder.status]?.color ?? ''}>
                  {ORDER_STATUS_CONFIG[detailOrder.status]?.label ?? detailOrder.status}
                </Badge>
              </div>

              {/* Items */}
              <div className="border border-slate-700/60 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Productos pedidos</p>
                </div>
                {(!detailOrder.items || detailOrder.items.length === 0) ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">Sin detalle disponible.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {detailOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{item.product_name}</p>
                          <p className="text-xs text-slate-500">
                            {item.product_flavor} · {formatCurrency(item.unit_price)} c/u
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm text-white font-semibold">
                            ×{item.quantity}
                          </p>
                          <p className="text-xs text-emerald-400 font-medium">
                            {formatCurrency(item.subtotal ?? item.unit_price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* Total row */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
                      <span className="text-sm font-semibold text-slate-300">
                        {detailOrder.items.reduce((s, i) => s + i.quantity, 0)} unidades
                      </span>
                      <span className="text-emerald-400 font-bold text-base">
                        {formatCurrency(detailOrder.total_amount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {detailOrder.notes && (
                <div className="bg-slate-800/40 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">Notas del pedido</p>
                  <p className="text-sm text-slate-300">{detailOrder.notes}</p>
                </div>
              )}
            </DialogBody>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Order Wizard Modal ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Nuevo Pedido</DialogTitle>
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={wizardStep === 'products' ? 'text-cyan-400 font-semibold' : 'text-slate-600'}>
                  1. Productos
                </span>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <span className={wizardStep === 'details' ? 'text-cyan-400 font-semibold' : 'text-slate-600'}>
                  2. Detalles
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* STEP 1 — Product selection */}
          {wizardStep === 'products' && (
            <>
              {/* Search bar — flex-shrink-0, never scrolls away */}
              <div className="flex-shrink-0 px-6 py-3 border-b border-slate-800">
                <SearchInput
                  placeholder="Buscar producto o sabor…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  containerClassName="bg-slate-800/80"
                  autoFocus
                />
              </div>

              {/* Products grid — ONLY this area scrolls */}
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleProducts.length === 0 && (
                    <p className="col-span-2 py-10 text-center text-slate-500 text-sm">Sin productos disponibles</p>
                  )}
                  {visibleProducts.map(product => {
                    const inCart    = cart.find(i => i.product.id === product.id)
                    const outOfStock = product.stock === 0
                    return (
                      <div
                        key={product.id}
                        className={[
                          'flex items-center justify-between rounded-xl px-3 py-2.5 border transition-all duration-150',
                          outOfStock ? 'opacity-50 border-slate-800 bg-slate-800/30' :
                          inCart ? 'bg-cyan-500/5 border-cyan-500/20' :
                          'bg-slate-800/50 border-slate-700/50 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <div className="min-w-0 mr-2">
                          <p className="text-sm text-white font-medium truncate">{product.name}</p>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(product.price_per_unit)} ·
                            {outOfStock
                              ? <span className="text-rose-400 ml-1">Sin stock</span>
                              : <span className="ml-1">Stock: {product.stock}</span>
                            }
                          </p>
                        </div>
                        {!outOfStock && (
                          inCart ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => updateQty(product.id, inCart.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-sm transition"
                                aria-label="Reducir cantidad"
                              >−</button>
                              <span className="text-white text-sm w-5 text-center font-medium">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQty(product.id, inCart.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-sm transition"
                                disabled={inCart.quantity >= product.stock}
                                aria-label="Aumentar cantidad"
                              >+</button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => addToCart(product)} className="shrink-0">
                              Agregar
                            </Button>
                          )
                        )}
                        {outOfStock && (
                          <span className="text-xs text-slate-600 shrink-0">Sin stock</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cart summary strip — flex-shrink-0, never scrolls away */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 mx-6 mb-2 bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    <span><span className="text-white font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)}</span> productos</span>
                  </div>
                  <span className="text-emerald-400 font-bold">{formatCurrency(cartTotal)}</span>
                </div>
              )}

              {/* Footer — flex-shrink-0, always visible */}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => setWizardStep('details')}
                  disabled={cart.length === 0}
                >
                  Siguiente · {formatCurrency(cartTotal)}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* STEP 2 — Details */}
          {wizardStep === 'details' && (
            <>
              <DialogBody className="space-y-4">
                {/* Order summary */}
                <div className="border border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-700/60">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resumen del pedido</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.product.name} <span className="text-slate-500">×{item.quantity}</span></span>
                        <span className="text-white font-medium">{formatCurrency(item.product.price_per_unit * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-700/60 pt-2 flex justify-between font-semibold">
                      <span className="text-slate-300">Total</span>
                      <span className="text-emerald-400 text-base">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Fecha de entrega">
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDelivery(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormField>
                  <FormField label="Notas">
                    <Input
                      placeholder="Instrucciones especiales…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </FormField>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWizardStep('products')}>
                  ← Volver
                </Button>
                <Button loading={loading} onClick={handleCreateOrder}>
                  Crear Pedido · {formatCurrency(cartTotal)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
