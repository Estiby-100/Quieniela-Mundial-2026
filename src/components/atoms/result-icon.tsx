import { cn } from '@/lib/utils'

type ResultStatus = 'correct' | 'wrong' | 'pending' | 'unknown'

interface ResultIconProps {
  status: ResultStatus
  className?: string
}

const icons: Record<ResultStatus, { emoji: string; label: string; classes: string }> = {
  correct: { emoji: '✅', label: 'Correcto', classes: '' },
  wrong: { emoji: '❌', label: 'Incorrecto', classes: '' },
  pending: { emoji: '⏳', label: 'Pendiente', classes: '' },
  unknown: { emoji: '—', label: 'Sin resultado', classes: 'text-muted-foreground' },
}

export function ResultIcon({ status, className }: ResultIconProps) {
  const { emoji, label, classes } = icons[status]

  return (
    <span
      className={cn('inline-flex items-center justify-center text-sm', classes, className)}
      title={label}
      aria-label={label}
    >
      {emoji}
    </span>
  )
}
