import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const [
    templateResult, teamsResult, bracketPredsResult,
    groupPredsResult, officialGroupResult, officialBracketResult,
    configResult,
  ] = await Promise.all([
    supabase.from('bracket_template').select('*').order('match_number'),
    supabase.from('teams').select('*'),
    supabase.from('bracket_predictions').select('*').eq('user_id', user.id),
    supabase.from('group_predictions').select('*').eq('user_id', user.id),
    supabase.from('official_group_results').select('*'),
    supabase.from('official_bracket_results').select('*'),
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
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

  // Resolve group slots from user's predictions + official fallback
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

  return (
    <BracketClient
      userId={user.id}
      template={template}
      teamsById={teamsById}
      initialPredictions={predictions}
      groupWinners={groupWinners}
      groupRunnerUps={groupRunnerUps}
      officialBracketMap={officialBracketMap}
      phase={phase}
    />
  )
}
