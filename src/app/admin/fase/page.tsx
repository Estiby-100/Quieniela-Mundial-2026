import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FaseClient } from './_components/fase-client'
import type { AppConfig, ScoringRule, TournamentPhase } from '@/lib/types/database.types'

export default async function FasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [configResult, rulesResult] = await Promise.all([
    supabase.from('app_config').select('*').eq('id', 1).single(),
    supabase.from('scoring_rules').select('*').order('rule_key'),
  ])

  const config = configResult.data as AppConfig | null
  const phase = (config?.tournament_phase ?? 'setup') as TournamentPhase
  const rules = (rulesResult.data ?? []) as ScoringRule[]

  return (
    <FaseClient
      currentPhase={phase}
      registrationOpen={config?.registration_open ?? false}
      publicPredictions={config?.public_predictions_after_close ?? false}
      scoringRules={rules}
      adminId={user.id}
    />
  )
}
