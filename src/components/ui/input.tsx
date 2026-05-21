import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-xl border bg-slate-900/50 px-3 py-2 text-sm text-slate-100',
          'placeholder:text-slate-500',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50',
          error
            ? 'border-rose-500/50 focus:ring-rose-500/50 focus:border-rose-500/50'
            : 'border-slate-700/80 hover:border-slate-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
