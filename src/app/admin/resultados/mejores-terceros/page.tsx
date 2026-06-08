import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TercerosAdminClient } from './_components/terceros-admin-client'
import type { Team, OfficialGroupResult } from '@/lib/types/database.types'

export default async function AdminResultadosMejoresTercerosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [teamsResult, officialsGroupResult, officialThirdsResult] = await Promise.all([
    supabase.from('teams').select('*').order('group_letter').order('group_position'),
    supabase.from('official_group_results').select('group_letter, position_3'),
    supabase.from('official_best_thirds').select('team_id'),
  ])

  const teams = (teamsResult.data ?? []) as Team[]
  const officialGroupResults = (officialsGroupResult.data ?? []) as Pick<OfficialGroupResult, 'group_letter' | 'position_3'>[]
  const selectedIds = (officialThirdsResult.data ?? []).map((r: { team_id: number }) => r.team_id)

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))

  // Pool: teams that officially finished 3rd in each group
  // Falls back to all teams when no official results yet
  const position3Ids = officialGroupResults.length > 0
    ? officialGroupResults.map((r) => r.position_3).filter(Boolean) as number[]
    : teams.map((t) => t.id)

  const groupsWithResults = officialGroupResults.length

  return (
    <TercerosAdminClient
      adminId={user.id}
      teamsById={teamsById}
      position3Ids={position3Ids}
      initialSelected={selectedIds}
      groupsWithResults={groupsWithResults}
    />
  )
}
