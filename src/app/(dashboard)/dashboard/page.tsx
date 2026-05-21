import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Order, Product, UserRole } from '@/lib/database.types'
import { formatCurrency } from '@/lib/utils'
import { RevenueChart, TopProductsChart, OrdersStatusChart } from '@/components/dashboard/charts'

export const metadata: Metadata = { title: 'Dashboard – Helados Sombrilla' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-GT', { month: 'short', year: '2-digit' })
}

const STATUS_COLORS: Record<string, string> = {
  pending:          '#64748b',
  awaiting_payment: '#f59e0b',
  paid:             '#10b981',
  in_delivery:      '#3b82f6',
  delivered:        '#14b8a6',
  cancelled:        '#f43f5e',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', awaiting_payment: 'Por Pagar', paid: 'Pagado',
  in_delivery: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  const isAdmin = profile?.role === 'admin'

  // ── Fetch data in parallel ────────────────────────────────
  const [ordersRes, productsRes, movementsRes] = await Promise.all([
    supabase.from('orders').select('id, status, total_amount, created_at').order('created_at'),
    supabase.from('products').select('id, name, stock, min_stock, is_active').order('name'),
    isAdmin
      ? supabase.from('inventory_movements')
          .select('product_id, movement_type, quantity, created_at')
          .eq('movement_type', 'out')
      : Promise.resolve({ data: [] }),
  ])

  const orders      = (ordersRes.data   ?? []) as Pick<Order, 'id' | 'status' | 'total_amount' | 'created_at'>[]
  const products    = (productsRes.data ?? []) as Pick<Product, 'id' | 'name' | 'stock' | 'min_stock' | 'is_active'>[]
  const movements   = (movementsRes.data ?? []) as { product_id: string; movement_type: string; quantity: number; created_at: string }[]

  // ── KPI Calculations ──────────────────────────────────────
  const paidOrders      = orders.filter(o => ['paid', 'in_delivery', 'delivered'].includes(o.status))
  const totalRevenue    = paidOrders.reduce((s, o) => s + o.total_amount, 0)
  const activeOrders    = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const lowStockCount   = products.filter(p => p.stock <= p.min_stock && p.is_active).length

  const now = new Date()
  const thisMonth = orders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const revenueThisMonth = thisMonth
    .filter(o => ['paid', 'in_delivery', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.total_amount, 0)

  // ── Revenue by month (last 6 months) ──────────────────────
  const revenueMap: Record<string, { revenue: number; orders: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = getMonthLabel(d.toISOString())
    revenueMap[key] = { revenue: 0, orders: 0 }
  }
  paidOrders.forEach(o => {
    const key = getMonthLabel(o.created_at)
    if (revenueMap[key]) {
      revenueMap[key].revenue += o.total_amount
      revenueMap[key].orders  += 1
    }
  })
  const revenueData = Object.entries(revenueMap).map(([month, v]) => ({ month, ...v }))

  // ── Top products by units sold ─────────────────────────────
  const productSales: Record<string, { name: string; sold: number; revenue: number }> = {}
  movements.forEach(m => {
    const prod = products.find(p => p.id === m.product_id)
    if (!prod) return
    if (!productSales[m.product_id]) productSales[m.product_id] = { name: prod.name, sold: 0, revenue: 0 }
    productSales[m.product_id].sold += m.quantity
  })
  const productsData = Object.values(productSales)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6)
    .map(p => ({ ...p, name: p.name.replace('Helado ', '') }))

  // ── Orders by status ──────────────────────────────────────
  const statusCount: Record<string, number> = {}
  orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1 })
  const statusData = Object.entries(statusCount).map(([status, value]) => ({
    name:  STATUS_LABELS[status] ?? status,
    value,
    color: STATUS_COLORS[status] ?? '#64748b',
  }))

  // ── Low stock products ────────────────────────────────────
  const lowStockProducts = products.filter(p => p.stock <= p.min_stock && p.is_active)

  const kpis = [
    {
      label:    'Ingresos Totales',
      value:    formatCurrency(totalRevenue),
      sub:      `+${formatCurrency(revenueThisMonth)} este mes`,
      icon:     '💰',
      gradient: 'from-emerald-500 to-teal-600',
      glow:     'shadow-emerald-500/20',
    },
    {
      label:    'Pedidos Activos',
      value:    String(activeOrders.length),
      sub:      `${thisMonth.length} nuevos este mes`,
      icon:     '📦',
      gradient: 'from-blue-500 to-cyan-600',
      glow:     'shadow-blue-500/20',
    },
    {
      label:    'Productos',
      value:    String(products.filter(p => p.is_active).length),
      sub:      `${lowStockCount} con stock bajo`,
      icon:     '🍦',
      gradient: 'from-violet-500 to-purple-600',
      glow:     'shadow-violet-500/20',
    },
    {
      label:    'Tasa de Entrega',
      value:    orders.length ? `${Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)}%` : '—',
      sub:      `${orders.filter(o => o.status === 'delivered').length} de ${orders.length} pedidos`,
      icon:     '🚚',
      gradient: 'from-amber-500 to-orange-600',
      glow:     'shadow-amber-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Panel de Control</h1>
        <p className="text-slate-400 text-sm mt-0.5">Resumen operativo de Helados Sombrilla</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl ${kpi.glow}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center text-xl shadow-lg`}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
            <p className="text-sm text-slate-400 font-medium">{kpi.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue area chart */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Ingresos por Mes</h2>
            <p className="text-xs text-slate-500">Últimos 6 meses (pedidos pagados)</p>
          </div>
          <RevenueChart data={revenueData} />
        </div>

        {/* Status donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Estado de Pedidos</h2>
            <p className="text-xs text-slate-500">Distribución actual</p>
          </div>
          {statusData.length > 0
            ? <OrdersStatusChart data={statusData} />
            : <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">Sin datos</div>
          }
        </div>
      </div>

      {/* Top products + Low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top products */}
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Productos Más Vendidos</h2>
              <p className="text-xs text-slate-500">Por unidades despachadas</p>
            </div>
            {productsData.length > 0
              ? <TopProductsChart data={productsData} />
              : <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">Sin movimientos de inventario aún</div>
            }
          </div>
        )}

        {/* Low stock alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">⚠ Productos con Stock Bajo</h2>
              <p className="text-xs text-slate-500">Requieren reposición o producción</p>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                {lowStockProducts.length} alertas
              </span>
            )}
          </div>
          {lowStockProducts.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-sm gap-2">
                <span className="text-2xl">✅</span>
                Todos los productos tienen stock suficiente
              </div>
            )
            : (
              <div className="space-y-2">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm text-white font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">Mínimo: {p.min_stock} uds</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-bold text-sm">{p.stock}</p>
                      <p className="text-xs text-slate-600">en stock</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Recent orders mini table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Pedidos Recientes</h2>
          <a href="/dashboard/orders" className="text-xs text-cyan-400 hover:text-cyan-300 transition">Ver todos →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['ID', 'Estado', 'Total', 'Fecha'].map(h => (
                  <th key={h} className="pb-3 px-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.slice(-8).reverse().map(order => (
                <tr key={order.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-2 font-mono text-xs text-slate-500">{order.id.slice(0, 8)}…</td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status] ? `bg-[${STATUS_COLORS[order.status]}]/10` : ''}`}
                      style={{ color: STATUS_COLORS[order.status], borderColor: `${STATUS_COLORS[order.status]}30`, backgroundColor: `${STATUS_COLORS[order.status]}15` }}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-emerald-400 font-semibold">{formatCurrency(order.total_amount)}</td>
                  <td className="py-2.5 px-2 text-slate-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-600">Sin pedidos todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
