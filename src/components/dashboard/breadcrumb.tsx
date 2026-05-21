'use client'

import { usePathname } from 'next/navigation'

// ─── Breadcrumb segments map ──────────────────────────────────────────────────
const BREADCRUMBS: Record<string, string> = {
  '/dashboard':            'Panel de Control',
  '/dashboard/orders':     'Pedidos',
  '/dashboard/products':   'Productos',
  '/dashboard/payments':   'Pagos',
  '/dashboard/clients':    'Clientes',
  '/dashboard/inventory':  'Inventario',
  '/dashboard/production': 'Producción',
  '/dashboard/deliveries': 'Entregas',
  '/dashboard/profile':    'Mi Perfil',
}

// ─── Breadcrumb client component ──────────────────────────────────────────────
function Breadcrumb() {
  const pathname = usePathname()
  const label    = BREADCRUMBS[pathname] ?? 'Dashboard'
  return (
    <span className="text-xs text-slate-500 font-medium tracking-wide">
      <span className="text-slate-300">{label}</span>
    </span>
  )
}

export { Breadcrumb }
