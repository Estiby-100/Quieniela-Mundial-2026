import { redirect } from 'next/navigation'
import { createClient, createRawServerClient } from '@/lib/supabase/server'
import { BracketClient } from './_components/bracket-client'
import type {
  Team, BracketTemplate, BracketPrediction,
  GroupPrediction, OfficialGroupResult,
  OfficialBracketResult, TournamentPhase,
} from '@/lib/types/database.types'

export default async function BracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rawSupabase = await createRawServerClient()

  const [
    templateResult, teamsResult, bracketPredsResult,
    groupPredsResult, officialGroupResult, officialBracketResult,
    configResult, resolvedBracketResult,
  ] = await Promise.all([
    supabase.from('bracket_template').select('*').order('match_number'),
    supabase.from('teams').select('*'),
    supabase.from('bracket_predictions').select('*').eq('user_id', user.id),
    supabase.from('group_predictions').select('*').eq('user_id', user.id),
    supabase.from('official_group_results').select('*'),
    supabase.from('official_bracket_results').select('*'),
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
    rawSupabase.rpc('resolve_user_bracket', { p_user_id: user.id }),
  ])

  const template = (templateResult.data ?? []) as BracketTemplate[]
  const teams = (teamsResult.data ?? []) as Team[]
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const bracketPreds = (bracketPredsResult.data ?? []) as BracketPrediction[]
  const groupPreds = (groupPredsResult.data ?? []) as GroupPrediction[]
  const officialGroups = (officialGroupResult.data ?? []) as OfficialGroupResult[]
  const officialBracket = (officialBracketResult.data ?? []) as OfficialBracketResult[]
  const phase = (configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup'

  const predictions: Record<number, number> = {}
  for (const p of bracketPreds) predictions[p.match_number] = p.winner_id

  const officialBracketMap: Record<number, number> = {}
  for (const r of officialBracket) officialBracketMap[r.match_number] = r.winner_id

  // Group slots from user predictions + official fallback
  const groupWinners: Record<string, number> = {}
  const groupRunnerUps: Record<string, number> = {}
  for (const pred of groupPreds) {
    groupWinners[pred.group_letter] = pred.position_1
    groupRunnerUps[pred.group_letter] = pred.position_2
  }
  for (const og of officialGroups) {
    if (!groupWinners[og.group_letter]) groupWinners[og.group_letter] = og.position_1
    if (!groupRunnerUps[og.group_letter]) groupRunnerUps[og.group_letter] = og.position_2
  }

  // Build serverSlots from RPC — authoritative source for best_third slot resolution.
  // The RPC uses the user's best_third_predictions + fifa_third_place_matrix to map
  // each best_third slot to the correct team. We only use these for best_third slots;
  // match_winner/match_loser are still computed dynamically on the client.
  type RpcRow = { match_number: number; slot_a_team_id: number | null; slot_b_team_id: number | null }
  const rpcRows = (resolvedBracketResult.data ?? []) as RpcRow[]
  const serverSlots: Record<number, { a: number | null; b: number | null }> = {}
  for (const row of rpcRows) {
    serverSlots[row.match_number] = { a: row.slot_a_team_id, b: row.slot_b_team_id }
  }

  return (
    <BracketClient
      userId={user.id}
      template={template}
      teamsById={teamsById}
      initialPredictions={predictions}
      groupWinners={groupWinners}
      groupRunnerUps={groupRunnerUps}
      officialBracketMap={officialBracketMap}
      serverSlots={serverSlots}
      phase={phase}
    />
  )
}
