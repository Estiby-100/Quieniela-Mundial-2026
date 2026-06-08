import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GruposClient } from './_components/grupos-client'
import type { Team, GroupPrediction, OfficialGroupResult, TournamentPhase } from '@/lib/types/database.types'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [teamsResult, predsResult, configResult, officialsResult] = await Promise.all([
    supabase.from('teams').select('*').order('group_letter').order('group_position'),
    supabase.from('group_predictions').select('*').eq('user_id', user.id),
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
    supabase.from('official_group_results').select('*'),
  ])

  const teams = (teamsResult.data ?? []) as Team[]
  const predictions = (predsResult.data ?? []) as GroupPrediction[]
  const phase = (configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup'
  const officialResults = (officialsResult.data ?? []) as OfficialGroupResult[]

  // Group teams by letter
  const teamsByGroup: Record<string, Team[]> = {}
  for (const team of teams) {
    if (!teamsByGroup[team.group_letter]) teamsByGroup[team.group_letter] = []
    teamsByGroup[team.group_letter].push(team)
  }

  // Map predictions by group letter
  const predsByGroup: Record<string, GroupPrediction> = {}
  for (const pred of predictions) {
    predsByGroup[pred.group_letter] = pred
  }

  const officialsByGroup: Record<string, OfficialGroupResult> = {}
  for (const res of officialResults) {
    officialsByGroup[res.group_letter] = res
  }

  return (
    <GruposClient
      userId={user.id}
      teamsByGroup={teamsByGroup}
      predsByGroup={predsByGroup}
      officialsByGroup={officialsByGroup}
      phase={phase}
    />
  )
}
