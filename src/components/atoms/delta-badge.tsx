import { cn } from '@/lib/utils'

interface DeltaBadgeProps {
  delta: number | null
  isNew?: boolean
  className?: string
}

export function DeltaBadge({ delta, isNew = false, className }: DeltaBadgeProps) {
  if (isNew) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded text-xs font-semibold px-1.5 py-0.5 bg-amber-500/20 text-amber-400',
          className
        )}
        title="Nuevo"
      >
        ★
      </span>
    )
  }

  if (delta === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded text-xs font-medium px-1.5 py-0.5 text-muted-foreground',
          className
        )}
      >
        ─
      </span>
    )
  }

  if (delta > 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded text-xs font-semibold px-1.5 py-0.5 bg-green-500/20 text-green-400',
          className
        )}
        title={`Subió ${delta} posición${delta !== 1 ? 'es' : ''}`}
      >
        ↑{delta}
      </span>
    )
  }

  if (delta < 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded text-xs font-semibold px-1.5 py-0.5 bg-red-500/20 text-red-400',
          className
        )}
        title={`Bajó ${Math.abs(delta)} posición${Math.abs(delta) !== 1 ? 'es' : ''}`}
      >
        ↓{Math.abs(delta)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded text-xs font-medium px-1.5 py-0.5 text-muted-foreground',
        className
      )}
    >
      ─
    </span>
  )
}
