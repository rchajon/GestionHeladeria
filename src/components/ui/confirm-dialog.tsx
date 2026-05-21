'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './dialog'
import { Button } from './button'
import { AlertTriangle, Info, Trash2 } from 'lucide-react'

interface ConfirmDialogProps {
  open:         boolean
  onClose:      () => void
  onConfirm:    () => void
  title:        string
  description?: string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:     'destructive' | 'default'
  loading?:     boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'default',
  loading      = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'destructive'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-cyan-500/10 text-cyan-400'
            }`}>
              {variant === 'destructive'
                ? <Trash2 className="w-5 h-5" />
                : <Info className="w-5 h-5" />
              }
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        {description && (
          <DialogBody>
            <p className="text-sm text-slate-400">{description}</p>
          </DialogBody>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
