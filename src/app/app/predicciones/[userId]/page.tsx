import { redirect, notFound } from 'next/navigation'
import { createClient, createRawServerClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PrediccionesView } from './_components/predicciones-view'
import type {
  Team, Profile, Standing, GroupPrediction, OfficialGroupResult,
  AppConfig, BracketTemplate, BracketPrediction, OfficialBracketResult,
  ScorerPrediction, OfficialTopScorer,
} from '@/lib/types/database.types'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function UserPrediccionesPage({ params }: PageProps) {
  const { userId: targetUserId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawSupabase = await createRawServerClient()

  const [
    configResult, profileResult, standingResult, allStandingsResult,
    teamsResult, groupPredsResult, officialsResult,
    thirdPredsResult, officialThirdsResult,
    templateResult, bracketPredsResult, officialBracketResult,
    scorerPredResult, officialScorerResult,
    resolvedBracketResult,
  ] = await Promise.all([
    supabase.from('app_config').select('tournament_phase, public_predictions_after_close').eq('id', 1).single(),
    supabase.from('profiles').select('full_name').eq('id', targetUserId).single(),
    supabase.from('standings').select('*').eq('user_id', targetUserId).maybeSingle(),
    supabase.from('standings').select('user_id, total_points').order('total_points', { ascending: false }),
    supabase.from('teams').select('*').order('group_letter').order('group_position'),
    supabase.from('group_predictions').select('*').eq('user_id', targetUserId),
    supabase.from('official_group_results').select('*'),
    supabase.from('best_third_predictions').select('team_id').eq('user_id', targetUserId),
    supabase.from('official_best_thirds').select('team_id'),
    supabase.from('bracket_template').select('*').order('match_number'),
    supabase.from('bracket_predictions').select('*').eq('user_id', targetUserId),
    supabase.from('official_bracket_results').select('*'),
    supabase.from('scorer_predictions').select('*').eq('user_id', targetUserId).maybeSingle(),
    supabase.from('official_top_scorer').select('*').eq('id', 1).maybeSingle(),
    rawSupabase.rpc('resolve_user_bracket', { p_user_id: targetUserId }),
  ])

  const config = configResult.data as Pick<AppConfig, 'tournament_phase' | 'public_predictions_after_close'> | null
  const phase = config?.tournament_phase ?? 'setup'
  const isOpen = phase === 'predictions_open'
  const isVisible = !isOpen && (config?.public_predictions_after_close ?? false)
  const isOwnProfile = targetUserId === user.id

  if (!isOwnProfile && !isVisible) redirect('/app/predicciones')

  const profileData = profileResult.data as Pick<Profile, 'full_name'> | null
  if (!profileData) notFound()

  const standing = standingResult.data as Standing | null
  const allStandings = (allStandingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points'>[]
  const position = allStandings.findIndex((s) => s.user_id === targetUserId) + 1

  // ── teams ────────────────────────────────────────────────────────────────
  const teams = (teamsResult.data ?? []) as Team[]
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const teamsByGroup: Record<string, Team[]> = {}
  for (const team of teams) {
    teamsByGroup[team.group_letter] ??= []
    teamsByGroup[team.group_letter].push(team)
  }

  // ── grupos ───────────────────────────────────────────────────────────────
  const groupPredictions = (groupPredsResult.data ?? []) as GroupPrediction[]
  const predsByGroup: Record<string, GroupPrediction> = {}
  for (const pred of groupPredictions) predsByGroup[pred.group_letter] = pred

  const officialsByGroup: Record<string, OfficialGroupResult> = {}
  for (const res of (officialsResult.data ?? []) as OfficialGroupResult[]) {
    officialsByGroup[res.group_letter] = res
  }

  // ── terceros ─────────────────────────────────────────────────────────────
  const selectedThirdIds = (thirdPredsResult.data ?? []).map((r: { team_id: number }) => r.team_id)
  const officialThirdIds = (officialThirdsResult.data ?? []).map((r: { team_id: number }) => r.team_id)
  const position3Ids = [...new Set(groupPredictions.map((p) => p.position_3))]

  // ── bracket ──────────────────────────────────────────────────────────────
  const template = (templateResult.data ?? []) as BracketTemplate[]
  const bracketPreds = (bracketPredsResult.data ?? []) as BracketPrediction[]
  const officialBracket = (officialBracketResult.data ?? []) as OfficialBracketResult[]

  const bracketPredictions: Record<number, number> = {}
  for (const p of bracketPreds) bracketPredictions[p.match_number] = p.winner_id

  const officialBracketMap: Record<number, number> = {}
  for (const r of officialBracket) officialBracketMap[r.match_number] = r.winner_id

  const groupWinners: Record<string, number> = {}
  const groupRunnerUps: Record<string, number> = {}
  for (const pred of groupPredictions) {
    groupWinners[pred.group_letter] = pred.position_1
    groupRunnerUps[pred.group_letter] = pred.position_2
  }
  for (const og of (officialsResult.data ?? []) as OfficialGroupResult[]) {
    if (!groupWinners[og.group_letter]) groupWinners[og.group_letter] = og.position_1
    if (!groupRunnerUps[og.group_letter]) groupRunnerUps[og.group_letter] = og.position_2
  }

  type RpcRow = { match_number: number; slot_a_team_id: number | null; slot_b_team_id: number | null }
  const rpcRows = (resolvedBracketResult.data ?? []) as RpcRow[]
  const serverSlots: Record<number, { a: number | null; b: number | null }> = {}
  for (const row of rpcRows) {
    serverSlots[row.match_number] = { a: row.slot_a_team_id, b: row.slot_b_team_id }
  }

  // ── goleador ─────────────────────────────────────────────────────────────
  const scorerPrediction = scorerPredResult.data as ScorerPrediction | null
  const officialTopScorer = officialScorerResult.data as OfficialTopScorer | null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-background z-10">
        <Link
          href="/app/predicciones"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted font-semibold">
              {getInitials(profileData.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold">{profileData.full_name ?? 'Participante'}</h1>
            <p className="text-sm text-muted-foreground">
              {position > 0 ? `#${position}` : '—'} · {standing?.total_points ?? 0} pts
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: Grupos / Terceros / Bracket / Goleador */}
      <div className="flex-1 overflow-hidden">
        <PrediccionesView
          userId={targetUserId}
          teamsByGroup={teamsByGroup}
          predsByGroup={predsByGroup}
          officialsByGroup={officialsByGroup}
          teamsById={teamsById}
          position3Ids={position3Ids}
          selectedThirdIds={selectedThirdIds}
          officialThirdIds={officialThirdIds}
          groupsCompleted={groupPredictions.length}
          template={template}
          bracketPredictions={bracketPredictions}
          groupWinners={groupWinners}
          groupRunnerUps={groupRunnerUps}
          officialBracketMap={officialBracketMap}
          serverSlots={serverSlots}
          teams={teams}
          scorerPrediction={scorerPrediction}
          officialTopScorer={officialTopScorer}
        />
      </div>
    </div>
  )
}
