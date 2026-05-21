import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-slate-700 text-slate-300 border-slate-600',
        pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
        success:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        danger:    'bg-rose-500/15 text-rose-400 border-rose-500/30',
        info:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
        teal:      'bg-teal-500/15 text-teal-400 border-teal-500/30',
        secondary: 'bg-slate-800 text-slate-300 border-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
