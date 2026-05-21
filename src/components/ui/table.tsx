import * as React from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean
}

function Table({ className, scrollable = true, ...props }: TableProps) {
  return (
    <div className={cn(scrollable && 'overflow-x-auto', className)}>
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b border-slate-800', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-slate-800/60', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-slate-800/40 transition-colors duration-100', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      style={{ padding: '12px 20px' }}
      className={cn(
        'text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      style={{ padding: '12px 20px' }}
      className={cn('text-slate-300', className)}
      {...props}
    />
  )
}

function TableEmpty({ colSpan, message = 'No hay datos.' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center text-slate-500 text-sm first:pl-0 last:pr-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-500">{message}</p>
        </div>
      </td>
    </tr>
  )
}

// ─── Skeleton loader for tables ───────────────────────────────────────────────
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-800/60">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3 px-4 first:pl-6 last:pr-6">
              <div
                className="h-4 bg-slate-800 rounded-full animate-pulse"
                style={{ width: `${60 + Math.random() * 30}%`, animationDelay: `${i * 50}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TableSkeleton }
