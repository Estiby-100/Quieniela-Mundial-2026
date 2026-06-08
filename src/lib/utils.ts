import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TournamentPhase } from './types/database.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(pts: number): string {
  return pts === 1 ? '1 punto' : `${pts} puntos`
}

export function formatPhase(phase: TournamentPhase): string {
  const labels: Record<TournamentPhase, string> = {
    setup: 'Configuración',
    predictions_open: 'Predicciones abiertas',
    predictions_closed: 'Predicciones cerradas',
    group_stage: 'Fase de grupos',
    round_of_32: 'Ronda de 32',
    round_of_16: 'Octavos de final',
    quarter_finals: 'Cuartos de final',
    semi_finals: 'Semifinales',
    final: 'Final',
    completed: 'Torneo finalizado',
  }
  return labels[phase] ?? phase
}

export function getPhaseColor(phase: TournamentPhase): 'amber' | 'blue' | 'green' | 'slate' {
  if (phase === 'predictions_open') return 'amber'
  if (phase === 'predictions_closed') return 'blue'
  if (phase === 'completed') return 'green'
  if (phase === 'setup') return 'slate'
  return 'blue'
}

export function getDelta(current: number, previous: number | null): number | null {
  if (previous === null) return null
  return previous - current
}
