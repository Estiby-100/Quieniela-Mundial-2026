export type TournamentPhase =
  | 'setup'
  | 'predictions_open'
  | 'predictions_closed'
  | 'group_stage'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_finals'
  | 'semi_finals'
  | 'final'
  | 'completed'

export type MatchRound = 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
export type SlotType = 'group_winner' | 'group_runner_up' | 'best_third' | 'match_winner' | 'match_loser'
export type SnapshotType = 'groups' | 'best_thirds' | 'bracket_resolved' | 'scorer' | 'full'

export interface Database {
  public: {
    Tables: {
      teams: { Row: Team; Insert: TeamInsert; Update: TeamUpdate }
      app_config: { Row: AppConfig; Insert: never; Update: AppConfigUpdate }
      scoring_rules: { Row: ScoringRule; Insert: ScoringRuleInsert; Update: ScoringRuleUpdate }
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      standings: { Row: Standing; Insert: never; Update: never }
      group_predictions: { Row: GroupPrediction; Insert: GroupPredictionInsert; Update: GroupPredictionUpdate }
      best_third_predictions: { Row: BestThirdPrediction; Insert: BestThirdPredictionInsert; Update: never }
      bracket_predictions: { Row: BracketPrediction; Insert: BracketPredictionInsert; Update: BracketPredictionUpdate }
      scorer_predictions: { Row: ScorerPrediction; Insert: ScorerPredictionInsert; Update: ScorerPredictionUpdate }
      official_group_results: { Row: OfficialGroupResult; Insert: OfficialGroupResultInsert; Update: OfficialGroupResultUpdate }
      official_best_thirds: { Row: OfficialBestThird; Insert: OfficialBestThirdInsert; Update: never }
      official_bracket_results: { Row: OfficialBracketResult; Insert: OfficialBracketResultInsert; Update: never }
      official_top_scorer: { Row: OfficialTopScorer; Insert: OfficialTopScorerInsert; Update: OfficialTopScorerUpdate }
      ranking_history: { Row: RankingHistory; Insert: never; Update: never }
      prediction_snapshots: { Row: PredictionSnapshot; Insert: never; Update: never }
      audit_log: { Row: AuditLog; Insert: never; Update: never }
      bracket_template: { Row: BracketTemplate; Insert: never; Update: never }
      fifa_third_place_matrix: { Row: FifaThirdPlaceMatrix; Insert: never; Update: never }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      current_phase: { Args: Record<string, never>; Returns: TournamentPhase }
      recalculate_standings: { Args: { p_scope?: string; p_recalculation_id?: string }; Returns: string }
      capture_all_snapshots: { Args: { p_snapshot_types?: SnapshotType[] }; Returns: number }
      resolve_user_bracket: {
        Args: { p_user_id: string }
        Returns: { match_number: number; slot_a_team_id: number; slot_b_team_id: number }[]
      }
    }
  }
}

export interface Team {
  id: number
  fifa_code: string
  name: string
  group_letter: string
  group_position: number
  flag_url: string | null
}

export interface AppConfig {
  id: number
  tournament_phase: TournamentPhase
  public_predictions_after_close: boolean
  registration_open: boolean
  updated_at: string
  updated_by: string | null
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  is_admin: boolean
  created_at: string
}

export interface Standing {
  user_id: string
  points_groups: number
  points_thirds: number
  points_bracket: number
  points_scorer: number
  total_points: number
  last_recalculated_at: string | null
}

export interface GroupPrediction {
  user_id: string
  group_letter: string
  position_1: number
  position_2: number
  position_3: number
  position_4: number
  updated_at: string
}

export interface BestThirdPrediction {
  user_id: string
  team_id: number
  updated_at: string
}

export interface BracketPrediction {
  user_id: string
  match_number: number
  winner_id: number
  updated_at: string
}

export interface ScorerPrediction {
  user_id: string
  player_name: string
  player_normalized: string
  team_id: number
  updated_at: string
}

export interface OfficialGroupResult {
  group_letter: string
  position_1: number
  position_2: number
  position_3: number
  position_4: number
  recorded_at: string
  recorded_by: string
}

export interface OfficialBestThird {
  team_id: number
  recorded_at: string
  recorded_by: string
}

export interface OfficialBracketResult {
  match_number: number
  winner_id: number
  recorded_at: string
  recorded_by: string
}

export interface OfficialTopScorer {
  id: number
  player_name: string
  player_normalized: string
  team_id: number
  recorded_at: string
  recorded_by: string
}

export interface ScoringRule {
  rule_key: string
  points: number
  description: string | null
}

export interface BracketTemplate {
  match_number: number
  round: MatchRound
  slot_a_type: SlotType
  slot_a_ref: string
  slot_b_type: SlotType
  slot_b_ref: string
  eligible_thirds: string[] | null
  display_order: number | null
}

export interface FifaThirdPlaceMatrix {
  id: number
  groups_key: string
  winner_a_faces: string
  winner_b_faces: string
  winner_d_faces: string
  winner_e_faces: string
  winner_g_faces: string
  winner_i_faces: string
  winner_k_faces: string
  winner_l_faces: string
}

export interface RankingHistory {
  id: number
  recalculation_id: string
  user_id: string
  position: number
  total_points: number
  points_groups: number
  points_thirds: number
  points_bracket: number
  points_scorer: number
  recorded_at: string
}

export interface PredictionSnapshot {
  id: number
  user_id: string
  snapshot_type: SnapshotType
  payload: Record<string, unknown>
  captured_at: string
  triggered_by: string
  tournament_phase_at_capture: TournamentPhase
}

export interface AuditLog {
  id: number
  actor_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// Insert/Update types
export type TeamInsert = Omit<Team, 'id'>
export type TeamUpdate = Partial<TeamInsert>
export type AppConfigUpdate = {
  tournament_phase?: TournamentPhase
  public_predictions_after_close?: boolean
  registration_open?: boolean
}
export type ScoringRuleInsert = ScoringRule
export type ScoringRuleUpdate = Partial<Pick<ScoringRule, 'points' | 'description'>>
export type ProfileInsert = Pick<Profile, 'id' | 'full_name'>
export type ProfileUpdate = Pick<Profile, 'full_name'>
export type GroupPredictionInsert = Omit<GroupPrediction, 'updated_at'>
export type GroupPredictionUpdate = Omit<GroupPrediction, 'user_id' | 'group_letter' | 'updated_at'>
export type BestThirdPredictionInsert = Omit<BestThirdPrediction, 'updated_at'>
export type BracketPredictionInsert = Omit<BracketPrediction, 'updated_at'>
export type BracketPredictionUpdate = Pick<BracketPrediction, 'winner_id'>
export type ScorerPredictionInsert = Omit<ScorerPrediction, 'player_normalized' | 'updated_at'>
export type ScorerPredictionUpdate = ScorerPredictionInsert
export type OfficialGroupResultInsert = Omit<OfficialGroupResult, 'recorded_at'>
export type OfficialGroupResultUpdate = Partial<OfficialGroupResultInsert>
export type OfficialBestThirdInsert = Omit<OfficialBestThird, 'recorded_at'>
export type OfficialBracketResultInsert = Omit<OfficialBracketResult, 'recorded_at'>
export type OfficialTopScorerInsert = Omit<OfficialTopScorer, 'player_normalized' | 'recorded_at'>
export type OfficialTopScorerUpdate = Partial<OfficialTopScorerInsert>
