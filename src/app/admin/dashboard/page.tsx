import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardContent } from './_components/admin-dashboard-content'
import type { AppConfig, AuditLog, TournamentPhase } from '@/lib/types/database.types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    configResult,
    profilesCountResult,
    standingsResult,
    auditResult,
    groupPredsCountResult,
    bracketPredsCountResult,
    scorerPredsCountResult,
  ] = await Promise.all([
    supabase.from('app_config').select('*').eq('id', 1).single(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('standings').select('user_id, total_points, last_recalculated_at').order('total_points', { ascending: false }),
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('group_predictions').select('user_id', { count: 'exact', head: true }),
    supabase.from('bracket_predictions').select('user_id', { count: 'exact', head: true }),
    supabase.from('scorer_predictions').select('user_id', { count: 'exact', head: true }),
  ])

  const config = configResult.data as AppConfig | null
  const phase = (config?.tournament_phase ?? 'setup') as TournamentPhase

  const totalProfiles = profilesCountResult.count ?? 0
  const standings = (standingsResult.data ?? []) as { user_id: string; total_points: number; last_recalculated_at: string | null }[]
  const lastRecalc = standings.find((s) => s.last_recalculated_at)?.last_recalculated_at ?? null

  // distinct users with at least one group prediction
  const usersWithGroups = groupPredsCountResult.count ?? 0
  const usersWithBracket = bracketPredsCountResult.count ?? 0
  const usersWithScorer = scorerPredsCountResult.count ?? 0

  const auditLogs = (auditResult.data ?? []) as AuditLog[]

  return (
    <AdminDashboardContent
      phase={phase}
      config={config}
      totalParticipants={totalProfiles}
      totalWithStandings={standings.length}
      usersWithGroups={usersWithGroups}
      usersWithBracket={usersWithBracket}
      usersWithScorer={usersWithScorer}
      lastRecalcAt={lastRecalc}
      auditLogs={auditLogs}
    />
  )
}
