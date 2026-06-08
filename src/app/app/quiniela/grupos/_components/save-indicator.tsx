'use client'

import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface SaveIndicatorProps {
  status: SaveStatus
  onSave: () => void
  onRetry: () => void
}

export function SaveIndicator({ status, onSave, onRetry }: SaveIndicatorProps) {
  return (
    <div className="flex items-center justify-end gap-2 mt-2 min-h-[28px]">
      {(status === 'idle' || status === 'unsaved') && (
        <>
          {status === 'unsaved' && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
              Sin guardar
            </span>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSave}>
            Guardar
          </Button>
        </>
      )}
      {status === 'saving' && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </span>
      )}
      {status === 'saved' && (
        <span className={cn('flex items-center gap-1 text-xs text-emerald-400')}>
          <Check className="h-3 w-3" />
          Guardado
        </span>
      )}
      {status === 'error' && (
        <>
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Error al guardar
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRetry}>
            Reintentar
          </Button>
        </>
      )}
    </div>
  )
}
