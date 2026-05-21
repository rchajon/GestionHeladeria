import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      React.ReactNode
  className?:   string
  /** Use 'table' variant inside a <td> (renders a <tr><td> wrapper) */
  as?:          'div' | 'table-row'
  colSpan?:     number
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: Omit<EmptyStateProps, 'as' | 'colSpan'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-slate-500">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        {description && (
          <p className="text-xs text-slate-500 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/** Variant for use inside a <tbody> — renders <tr><td> */
export function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  action,
}: Required<Pick<EmptyStateProps, 'colSpan'>> & Omit<EmptyStateProps, 'as' | 'colSpan' | 'className'>) {
  return (
    <tr>
      <td colSpan={colSpan} className="first:pl-0 last:pr-0">
        <EmptyState icon={icon} title={title} description={description} action={action} />
      </td>
    </tr>
  )
}
