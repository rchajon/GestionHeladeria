'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Dialog({ open, onClose, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)

  // Only render portal on client
  React.useEffect(() => { setMounted(true) }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted || !open) return null

  // Portal: renders outside the layout's overflow-hidden container
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      {/* Dialog wrapper — scrollable for tall content */}
      <div className="fixed inset-0 z-[101] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative w-full flex justify-center py-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          >
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      'w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col',
      className
    )}>
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-slate-800">
      {children}
    </div>
  )
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold text-white', className)}>{children}</h2>
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
      {children}
    </div>
  )
}
