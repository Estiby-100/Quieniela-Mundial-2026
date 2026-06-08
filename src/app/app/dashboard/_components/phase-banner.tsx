'use client'

import { formatPhase } from '@/lib/utils'
import type { TournamentPhase } from '@/lib/types/database.types'
import { PhaseBadge } from '@/components/atoms/phase-badge'
import { Clock, Trophy, Lock, PlayCircle } from 'lucide-react'

interface PhaseBannerProps {
  phase: TournamentPhase
}

const phaseIcons: Partial<Record<TournamentPhase, React.ReactNode>> = {
  setup: <Clock className="h-5 w-5" />,
  predictions_open: <PlayCircle className="h-5 w-5" />,
  predictions_closed: <Lock className="h-5 w-5" />,
  completed: <Trophy className="h-5 w-5" />,
}

const phaseDescriptions: Partial<Record<TournamentPhase, string>> = {
  setup: 'El torneo aún no ha comenzado. Pronto podrás hacer tus predicciones.',
  predictions_open: 'Las predicciones están abiertas. ¡Completa tu quiniela antes de que cierren!',
  predictions_closed: 'Las predicciones están cerradas. ¡Que empiece el torneo!',
  group_stage: 'Estamos en la fase de grupos. Los resultados se van actualizando.',
  round_of_32: 'Ronda de 32 equipos en juego.',
  round_of_16: 'Octavos de final en curso.',
  quarter_finals: 'Cuartos de final. ¡Solo quedan 8 equipos!',
  semi_finals: '¡Semifinales! Los mejores 4 equipos del mundo.',
  final: '¡La gran final del Mundial 2026!',
  completed: 'El torneo ha finalizado. Consulta los resultados finales.',
}

export function PhaseBanner({ phase }: PhaseBannerProps) {
  const icon = phaseIcons[phase]
  const description = phaseDescriptions[phase] ?? formatPhase(phase)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">Fase actual</span>
            <PhaseBadge phase={phase} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}
