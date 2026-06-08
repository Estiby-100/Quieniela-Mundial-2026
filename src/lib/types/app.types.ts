import type { TournamentPhase } from './database.types'

export interface StandingWithProfile {
  user_id: string
  full_name: string | null
  email: string | null
  total_points: number
  points_groups: number
  points_thirds: number
  points_bracket: number
  points_scorer: number
  position: number
  prev_position: number | null
  delta: number | null
}

export interface UserContext {
  id: string
  full_name: string | null
  is_admin: boolean
  standing: {
    total_points: number
    position: number
  } | null
}

export interface QuinielaProgress {
  grupos_completed: number
  grupos_total: 12
  terceros_completed: number
  terceros_total: 8
  bracket_completed: number
  bracket_total: 32
  goleador_done: boolean
  overall_pct: number
}

export type PhaseLabel = {
  key: TournamentPhase
  label: string
  shortLabel: string
  color: 'amber' | 'blue' | 'green' | 'slate'
}
