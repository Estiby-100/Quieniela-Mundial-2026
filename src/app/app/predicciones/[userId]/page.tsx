import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GruposClient } from '@/app/app/quiniela/grupos/_components/grupos-client'
import type {
  Team, Profile, Standing, GroupPrediction, OfficialGroupResult,
  AppConfig, TournamentPhase,
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

  const [configResult, profileResult, standingResult, teamsResult, groupPredsResult, officialsResult, allStandingsResult] =
    await Promise.all([
      supabase.from('app_config').select('tournament_phase, public_predictions_after_close').eq('id', 1).single(),
      supabase.from('profiles').select('full_name').eq('id', targetUserId).single(),
      supabase.from('standings').select('*').eq('user_id', targetUserId).maybeSingle(),
      supabase.from('teams').select('*').order('group_letter').order('group_position'),
      supabase.from('group_predictions').select('*').eq('user_id', targetUserId),
      supabase.from('official_group_results').select('*'),
      supabase.from('standings').select('user_id, total_points').order('total_points', { ascending: false }),
    ])

  const config = configResult.data as Pick<AppConfig, 'tournament_phase' | 'public_predictions_after_close'> | null
  const phase = (config?.tournament_phase ?? 'setup') as TournamentPhase
  const isOpen = phase === 'predictions_open'
  const isVisible = !isOpen && (config?.public_predictions_after_close ?? false)
  const isOwnProfile = targetUserId === user.id

  if (!isOwnProfile && !isVisible) redirect('/app/predicciones')

  const profileData = profileResult.data as Pick<Profile, 'full_name'> | null
  if (!profileData) notFound()

  const profile = profileData
  const standing = standingResult.data as Standing | null
  const allStandings = (allStandingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points'>[]
  const position = allStandings.findIndex((s) => s.user_id === targetUserId) + 1

  const teams = (teamsResult.data ?? []) as Team[]
  const teamsByGroup: Record<string, Team[]> = {}
  for (const team of teams) {
    if (!teamsByGroup[team.group_letter]) teamsByGroup[team.group_letter] = []
    teamsByGroup[team.group_letter].push(team)
  }

  const groupPredictions = (groupPredsResult.data ?? []) as GroupPrediction[]
  const predsByGroup: Record<string, GroupPrediction> = {}
  for (const pred of groupPredictions) predsByGroup[pred.group_letter] = pred

  const officialsByGroup: Record<string, OfficialGroupResult> = {}
  for (const res of (officialsResult.data ?? []) as OfficialGroupResult[]) {
    officialsByGroup[res.group_letter] = res
  }

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
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold">{profile.full_name ?? 'Participante'}</h1>
            <p className="text-sm text-muted-foreground">
              {position > 0 ? `#${position}` : '—'} · {standing?.total_points ?? 0} pts
            </p>
          </div>
        </div>
      </div>

      {/* Groups read-only */}
      <div className="flex-1 overflow-y-auto">
        <GruposClient
          userId={targetUserId}
          teamsByGroup={teamsByGroup}
          predsByGroup={predsByGroup}
          officialsByGroup={officialsByGroup}
          phase="predictions_closed"
        />
      </div>
    </div>
  )
}
