'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id:      string
  message: string
  type:    ToastType
}

// ─── Single Toast ─────────────────────────────────────────────────────────────
interface ToastProps extends ToastItem {
  onClose: (id: string) => void
  index:   number          // for stacking offset
}

function Toast({ id, message, type, onClose, index }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4500)
    return () => clearTimeout(timer)
  }, [id, onClose])

  const config = {
    success: {
      styles: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-300',
      icon:   <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    error: {
      styles: 'border-rose-500/30 bg-rose-950/80 text-rose-300',
      icon:   <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    },
    info: {
      styles: 'border-cyan-500/30 bg-cyan-950/80 text-cyan-300',
      icon:   <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
    },
  }[type]

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl shadow-black/50',
        'backdrop-blur-md text-sm font-medium max-w-sm w-full',
        'animate-slide-right',
        config.styles
      )}
      style={{ marginBottom: index > 0 ? '0.5rem' : 0 }}
      role="alert"
      aria-live="polite"
    >
      {config.icon}
      <span className="flex-1 text-sm">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="opacity-50 hover:opacity-100 transition ml-1 shrink-0"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Toast Container (stacked) ────────────────────────────────────────────────
interface ToastContainerProps {
  toasts: ToastItem[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-[102] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t, i) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onClose={onClose} index={i} />
        </div>
      ))}
    </div>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const show = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const hide = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const ToastComponent = <ToastContainer toasts={toasts} onClose={hide} />

  return { show, hide, ToastComponent }
}
