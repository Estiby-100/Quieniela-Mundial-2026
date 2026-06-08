import { cn, formatPhase } from '@/lib/utils'
import type { TournamentPhase } from '@/lib/types/database.types'

interface PhaseBadgeProps {
  phase: TournamentPhase
  className?: string
}

const phaseStyles: Record<TournamentPhase, string> = {
  setup: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  predictions_open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  predictions_closed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  group_stage: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  round_of_32: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  round_of_16: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  quarter_finals: 'bg-green-500/20 text-green-400 border-green-500/30',
  semi_finals: 'bg-green-500/20 text-green-400 border-green-500/30',
  final: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const isPulsing = phase === 'predictions_open'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        phaseStyles[phase],
        className
      )}
    >
      {isPulsing && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
      )}
      {formatPhase(phase)}
    </span>
  )
}
