import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from './_components/dashboard-content'
import type { Profile, Standing } from '@/lib/types/database.types'
import type { TournamentPhase } from '@/lib/types/database.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    configResult,
    groupsProgressResult,
    bracketProgressResult,
    scorerResult,
    standingsResult,
    myStandingResult,
  ] = await Promise.all([
    supabase
      .from('app_config')
      .select('tournament_phase, public_predictions_after_close')
      .eq('id', 1)
      .single(),
    supabase
      .from('group_predictions')
      .select('group_letter', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('bracket_predictions')
      .select('match_number', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase.from('scorer_predictions').select('player_name').eq('user_id', user.id).single(),
    supabase
      .from('standings')
      .select(
        'user_id, total_points, points_groups, points_thirds, points_bracket, points_scorer'
      )
      .order('total_points', { ascending: false })
      .limit(10),
    supabase.from('standings').select('total_points').eq('user_id', user.id).single(),
  ])

  type StandingRow = Pick<Standing, 'user_id' | 'total_points' | 'points_groups' | 'points_thirds' | 'points_bracket' | 'points_scorer'>
  const topStandings: StandingRow[] = (standingsResult.data ?? []) as StandingRow[]

  let profilesData: Pick<Profile, 'id' | 'full_name'>[] = []
  if (topStandings.length > 0) {
    const profilesResult = await supabase
      .from('profiles')
      .select('id, full_name')
      .in(
        'id',
        topStandings.map((s) => s.user_id)
      )
    profilesData = profilesResult.data ?? []
  }

  const userPosition = myStandingResult.data
    ? topStandings.findIndex((s) => s.user_id === user.id) + 1
    : null

  return (
    <DashboardContent
      userId={user.id}
      phase={((configResult.data as { tournament_phase?: TournamentPhase } | null)?.tournament_phase) ?? 'setup'}
      groupsCompleted={groupsProgressResult.count ?? 0}
      bracketCompleted={bracketProgressResult.count ?? 0}
      goleadorDone={!!scorerResult.data}
      topStandings={topStandings}
      profiles={profilesData}
      userPosition={userPosition}
      userPoints={((myStandingResult.data as { total_points?: number } | null)?.total_points) ?? 0}
    />
  )
}
