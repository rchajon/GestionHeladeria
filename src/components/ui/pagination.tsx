'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page:       number
  totalPages: number
  total:      number
  pageSize:   number
  onPage:     (page: number) => void
  className?: string
  label?:     string   // e.g. "pedidos"
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  className,
  label = 'registros',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Generate visible page numbers (max 5 around current)
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className={cn(
      'px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-4',
      className
    )}>
      <span className="text-xs text-slate-500">
        {from}–{to} de {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`sep-${i}`} className="w-8 text-center text-xs text-slate-600">…</span>
            : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150',
                  p === page
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                )}
              >
                {p}
              </button>
            )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
