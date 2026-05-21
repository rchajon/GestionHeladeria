'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RevenuePoint  { month: string; revenue: number; orders: number }
interface ProductPoint  { name: string; sold: number; revenue: number }
interface StatusPoint   { name: string; value: number; color: string }

interface DashboardChartsProps {
  revenueData:  RevenuePoint[]
  productsData: ProductPoint[]
  statusData:   StatusPoint[]
}

// ─── Tooltip styles ───────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#0f172a',
  border:          '1px solid #1e293b',
  borderRadius:    '12px',
  color:           '#f1f5f9',
  fontSize:        '12px',
}

// ─── Revenue Area Chart ────────────────────────────────────────────────────────
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name) => {
          const v = typeof value === 'number' ? value : 0
          return [formatCurrency(v), 'Ingresos']
        }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Top Products Bar Chart ────────────────────────────────────────────────────
export function TopProductsChart({ data }: { data: ProductPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
          const v = typeof value === 'number' ? value : 0
          return [name === 'sold' ? `${v} uds` : formatCurrency(v), name === 'sold' ? 'Vendido' : 'Ingresos']
        }}
        />
        <Bar dataKey="sold" fill="#06b6d4" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Orders by Status Pie Chart ───────────────────────────────────────────────
export function OrdersStatusChart({ data }: { data: StatusPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => {
          const v = typeof value === 'number' ? value : 0
          const payload = item?.payload as StatusPoint | undefined
          return [`${v} pedidos`, payload?.name ?? '']
        }}
        />
        <Legend
          formatter={(value: string) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
