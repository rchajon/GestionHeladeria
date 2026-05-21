import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

/**
 * Input de búsqueda con ícono de lupa a la derecha.
 * Usa flex para alineación — no absolute positioning.
 */
export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-10 w-full rounded-xl border border-slate-700/80',
        'bg-slate-900/50 px-3',
        'focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/50',
        'hover:border-slate-600 transition-all duration-150',
        containerClassName
      )}
    >
      <input
        className={cn(
          'flex-1 min-w-0 bg-transparent text-sm text-slate-100',
          'placeholder:text-slate-500 focus:outline-none',
          className
        )}
        {...props}
      />
      <Search className="w-4 h-4 text-slate-500 shrink-0 pointer-events-none" />
    </div>
  )
}
