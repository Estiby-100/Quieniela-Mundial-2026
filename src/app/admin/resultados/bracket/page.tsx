import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BracketAdminClient } from './_components/bracket-admin-client'
import type {
  Team, BracketTemplate, OfficialGroupResult, OfficialBracketResult,
} from '@/lib/types/database.types'

export default async function AdminResultadosBracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [templateResult, teamsResult, officialGroupResult, officialBracketResult] =
    await Promise.all([
      supabase.from('bracket_template').select('*').order('match_number'),
      supabase.from('teams').select('*'),
      supabase.from('official_group_results').select('*'),
      supabase.from('official_bracket_results').select('*'),
    ])

  const template = (templateResult.data ?? []) as BracketTemplate[]
  const teams = (teamsResult.data ?? []) as Team[]
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const officialGroups = (officialGroupResult.data ?? []) as OfficialGroupResult[]
  const officialBracket = (officialBracketResult.data ?? []) as OfficialBracketResult[]

  const officialBracketMap: Record<number, number> = {}
  for (const r of officialBracket) officialBracketMap[r.match_number] = r.winner_id

  // Resolve group slots from official group results
  const groupWinners: Record<string, number> = {}
  const groupRunnerUps: Record<string, number> = {}
  for (const og of officialGroups) {
    groupWinners[og.group_letter] = og.position_1
    groupRunnerUps[og.group_letter] = og.position_2
  }

  return (
    <BracketAdminClient
      adminId={user.id}
      template={template}
      teamsById={teamsById}
      initialResults={officialBracketMap}
      groupWinners={groupWinners}
      groupRunnerUps={groupRunnerUps}
    />
  )
}
