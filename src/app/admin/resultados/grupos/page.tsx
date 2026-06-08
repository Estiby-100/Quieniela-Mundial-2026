import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GruposAdminClient } from './_components/grupos-admin-client'
import type { Team, OfficialGroupResult } from '@/lib/types/database.types'

export default async function AdminResultadosGruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [teamsResult, officialsResult] = await Promise.all([
    supabase.from('teams').select('*').order('group_letter').order('group_position'),
    supabase.from('official_group_results').select('*'),
  ])

  const teams = (teamsResult.data ?? []) as Team[]
  const officialResults = (officialsResult.data ?? []) as OfficialGroupResult[]

  const teamsByGroup: Record<string, Team[]> = {}
  for (const team of teams) {
    if (!teamsByGroup[team.group_letter]) teamsByGroup[team.group_letter] = []
    teamsByGroup[team.group_letter].push(team)
  }

  const officialsByGroup: Record<string, OfficialGroupResult> = {}
  for (const res of officialResults) officialsByGroup[res.group_letter] = res

  return (
    <GruposAdminClient
      adminId={user.id}
      teamsByGroup={teamsByGroup}
      officialsByGroup={officialsByGroup}
    />
  )
}
