import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RankingClient } from './_components/ranking-client'
import type { Standing, Profile, RankingHistory, TournamentPhase } from '@/lib/types/database.types'
import type { StandingWithProfile } from '@/lib/types/app.types'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [standingsResult, configResult, historyResult] = await Promise.all([
    supabase
      .from('standings')
      .select('*')
      .order('total_points', { ascending: false }),
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
    // Get the most recent two recalculation passes for delta computation
    supabase
      .from('ranking_history')
      .select('recalculation_id, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(1),
  ])

  const standings = (standingsResult.data ?? []) as Standing[]
  const phase = (configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup'

  // Get profiles for all users in standings
  const profilesResult = standings.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', standings.map((s) => s.user_id))
    : { data: [] }
  const profiles = (profilesResult.data ?? []) as Pick<Profile, 'id' | 'full_name'>[]
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]))

  // Get previous ranking for delta
  let prevRanking: Record<string, number> = {}
  const latestRecalc = (historyResult.data as { recalculation_id: string; recorded_at: string }[] | null)?.[0]
  if (latestRecalc) {
    // Find the recalculation BEFORE the latest one
    const prevResult = await supabase
      .from('ranking_history')
      .select('recalculation_id, recorded_at')
      .order('recorded_at', { ascending: false })
      .neq('recalculation_id', latestRecalc.recalculation_id as string)
      .limit(1)

    const prevRecalc = (prevResult.data as { recalculation_id: string }[] | null)?.[0]
    if (prevRecalc) {
      const prevRows = await supabase
        .from('ranking_history')
        .select('user_id, position')
        .eq('recalculation_id', prevRecalc.recalculation_id)
      for (const row of (prevRows.data ?? []) as Pick<RankingHistory, 'user_id' | 'position'>[]) {
        prevRanking[row.user_id] = row.position
      }
    }
  }

  const standingsWithProfile: StandingWithProfile[] = standings.map((s, i) => {
    const position = i + 1
    const prevPosition = prevRanking[s.user_id] ?? null
    return {
      user_id: s.user_id,
      full_name: profilesById[s.user_id]?.full_name ?? null,
      total_points: s.total_points,
      points_groups: s.points_groups,
      points_thirds: s.points_thirds,
      points_bracket: s.points_bracket,
      points_scorer: s.points_scorer,
      position,
      prev_position: prevPosition,
      delta: prevPosition !== null ? prevPosition - position : null,
    }
  })

  return (
    <RankingClient
      userId={user.id}
      standings={standingsWithProfile}
      phase={phase}
    />
  )
}
