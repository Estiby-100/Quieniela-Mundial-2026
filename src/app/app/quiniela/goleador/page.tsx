import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoleadorClient } from './_components/goleador-client'
import type { Team, ScorerPrediction, OfficialTopScorer, TournamentPhase } from '@/lib/types/database.types'

export default async function GoleadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [teamsResult, predResult, officialResult, configResult] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('scorer_predictions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('official_top_scorer').select('*').eq('id', 1).maybeSingle(),
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
  ])

  return (
    <GoleadorClient
      userId={user.id}
      teams={(teamsResult.data ?? []) as Team[]}
      initial={predResult.data as ScorerPrediction | null}
      official={officialResult.data as OfficialTopScorer | null}
      phase={((configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup')}
    />
  )
}
