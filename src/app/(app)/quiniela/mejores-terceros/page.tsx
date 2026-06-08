import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TercerosClient } from './_components/terceros-client'
import type { Team, GroupPrediction, TournamentPhase } from '@/lib/types/database.types'

export default async function MejoresTercerosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [teamsResult, groupPredsResult, thirdPredsResult, configResult, officialsResult] =
    await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('group_predictions').select('*').eq('user_id', user.id),
      supabase.from('best_third_predictions').select('team_id').eq('user_id', user.id),
      supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
      supabase.from('official_best_thirds').select('team_id'),
    ])

  const teams = (teamsResult.data ?? []) as Team[]
  const groupPredictions = (groupPredsResult.data ?? []) as GroupPrediction[]
  const selectedIds = (thirdPredsResult.data ?? []).map((r: { team_id: number }) => r.team_id)
  const phase = (configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup'
  const officialThirdIds = (officialsResult.data ?? []).map((r: { team_id: number }) => r.team_id)

  // Teams that appear as position_3 in user's group predictions
  const position3Ids = new Set(groupPredictions.map((p) => p.position_3))
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))

  return (
    <TercerosClient
      userId={user.id}
      teamsById={teamsById}
      position3Ids={[...position3Ids]}
      initialSelected={selectedIds}
      groupsCompleted={groupPredictions.length}
      phase={phase}
      officialThirdIds={officialThirdIds}
    />
  )
}
