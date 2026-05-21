'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  IceCream,
  CreditCard,
  Users,
  BarChart3,
  Factory,
  Truck,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { signOut } from '@/actions/auth'
import type { UserRole } from '@/lib/database.types'

interface NavLink {
  href:      string
  label:     string
  icon:      React.ReactNode
  adminOnly: boolean
}

interface SidebarProps {
  role:         UserRole
  fullName:     string
  businessName: string | null
  email:        string
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',            label: 'Dashboard',  icon: <LayoutDashboard className="w-4 h-4" />, adminOnly: false },
  { href: '/dashboard/orders',     label: 'Pedidos',    icon: <Package          className="w-4 h-4" />, adminOnly: false },
  { href: '/dashboard/products',   label: 'Productos',  icon: <IceCream         className="w-4 h-4" />, adminOnly: false },
  { href: '/dashboard/payments',   label: 'Pagos',      icon: <CreditCard       className="w-4 h-4" />, adminOnly: false },
  { href: '/dashboard/clients',    label: 'Clientes',   icon: <Users            className="w-4 h-4" />, adminOnly: true  },
  { href: '/dashboard/inventory',  label: 'Inventario', icon: <BarChart3        className="w-4 h-4" />, adminOnly: true  },
  { href: '/dashboard/production', label: 'Producción', icon: <Factory          className="w-4 h-4" />, adminOnly: true  },
  { href: '/dashboard/deliveries', label: 'Entregas',   icon: <Truck            className="w-4 h-4" />, adminOnly: true  },
]

function NavItem({ link, isActive, onClick }: { link: NavLink; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group',
        isActive
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/10'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent',
      ].join(' ')}
    >
      <span className={[
        'shrink-0 transition-transform duration-150',
        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-110',
      ].join(' ')}>
        {link.icon}
      </span>
      <span className="flex-1 font-medium">{link.label}</span>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
    </Link>
  )
}

function SidebarContent({
  role,
  fullName,
  businessName,
  email,
  onLinkClick,
}: SidebarProps & { onLinkClick?: () => void }) {
  const pathname  = usePathname()
  const isAdmin   = role === 'admin'
  const initials  = (fullName || 'U')[0].toUpperCase()
  const visibleLinks = NAV_LINKS.filter(l => !l.adminOnly || isAdmin)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo — object-contain keeps the full image without cropping */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800/60 shrink-0 shadow-lg shadow-black/40 ring-1 ring-white/5">
            <Image
              src="/logo.png"
              alt="Helados Sombrilla Artesanal"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white tracking-tight leading-snug">Helados Sombrilla</p>
            <p className="text-[11px] text-slate-400 leading-snug">Artesanal</p>
            <p className="text-[11px] font-semibold mt-1">
              {isAdmin
                ? <span className="text-amber-400">Administrador</span>
                : <span className="text-cyan-400">Revendedor</span>
              }
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {isAdmin && (
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            General
          </p>
        )}
        {visibleLinks.filter(l => !l.adminOnly).map(link => (
          <NavItem key={link.href} link={link} isActive={isActive(link.href)} onClick={onLinkClick} />
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              Administración
            </p>
            {visibleLinks.filter(l => l.adminOnly).map(link => (
              <NavItem key={link.href} link={link} isActive={isActive(link.href)} onClick={onLinkClick} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800/80 shrink-0 space-y-1">
        <Link
          href="/dashboard/profile"
          onClick={onLinkClick}
          className={[
            'flex items-center gap-3 px-2 py-2 rounded-xl transition-colors group border',
            isActive('/dashboard/profile')
              ? 'bg-slate-800/80 border-slate-700/50'
              : 'hover:bg-slate-800/60 border-transparent',
          ].join(' ')}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
              {fullName}
            </p>
            <p className="text-xs text-slate-500 truncate">{businessName ?? email}</p>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* ── Mobile toggle button ── */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition shadow-lg"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* ── Mobile overlay backdrop ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar (desktop: static / mobile: drawer) ── */}
      <aside
        className={[
          'fixed lg:relative inset-y-0 left-0 z-40',
          'w-64 shrink-0 bg-slate-900/95 border-r border-slate-800/80',
          'flex flex-col h-full',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <SidebarContent {...props} onLinkClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
