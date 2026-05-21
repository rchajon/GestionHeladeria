// ============================================================
// lib/utils.ts — shared utility functions
// ============================================================
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format currency in MXN */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style:    'currency',
    currency: 'GTQ',
  }).format(amount)
}

/** Format date to readable Spanish string (Guatemala locale) */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(dateStr))
}

/** Map OrderStatus to display config */
export const ORDER_STATUS_CONFIG = {
  pending:          { label: 'Pendiente',    color: 'bg-slate-700 text-slate-300' },
  awaiting_payment: { label: 'Por Pagar',    color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  paid:             { label: 'Pagado',       color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  in_delivery:      { label: 'En Camino',    color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  delivered:        { label: 'Entregado',    color: 'bg-teal-500/20 text-teal-400 border border-teal-500/30' },
  cancelled:        { label: 'Cancelado',    color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
} as const

export const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400' },
  approved: { label: 'Aprobado',  color: 'bg-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Rechazado', color: 'bg-rose-500/20 text-rose-400' },
} as const
