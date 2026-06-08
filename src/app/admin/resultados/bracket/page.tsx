import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BracketAdminClient } from './_components/bracket-admin-client'
import type {
  Team, BracketTemplate, OfficialGroupResult, OfficialBracketResult,
  FifaThirdPlaceMatrix,
} from '@/lib/types/database.types'

// Derives which source group's 3rd-place team occupies a best_third slot.
// receivingGroupLetter is slot_*_ref from bracket_template (e.g. 'E').
// The matrix columns are winner_a_faces, winner_b_faces, ... winner_l_faces,
// covering only the 8 groups that receive a best_third opponent (A,B,D,E,G,I,K,L).
function getSourceGroup(matrixRow: FifaThirdPlaceMatrix, receivingGroupLetter: string): string | null {
  const col = `winner_${receivingGroupLetter.toLowerCase()}_faces` as keyof FifaThirdPlaceMatrix
  const val = matrixRow[col]
  return typeof val === 'string' ? val : null
}

export default async function AdminResultadosBracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    templateResult, teamsResult, officialGroupResult,
    officialBracketResult, officialBestThirdsResult,
  ] = await Promise.all([
    supabase.from('bracket_template').select('*').order('match_number'),
    supabase.from('teams').select('*'),
    supabase.from('official_group_results').select('*'),
    supabase.from('official_bracket_results').select('*'),
    supabase.from('official_best_thirds').select('team_id'),
  ])

  const template = (templateResult.data ?? []) as BracketTemplate[]
  const teams = (teamsResult.data ?? []) as Team[]
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const officialGroups = (officialGroupResult.data ?? []) as OfficialGroupResult[]
  const officialBracket = (officialBracketResult.data ?? []) as OfficialBracketResult[]

  const officialBracketMap: Record<number, number> = {}
  for (const r of officialBracket) officialBracketMap[r.match_number] = r.winner_id

  const groupWinners: Record<string, number> = {}
  const groupRunnerUps: Record<string, number> = {}
  const officialPosition3ByGroup: Record<string, number> = {}
  for (const og of officialGroups) {
    groupWinners[og.group_letter] = og.position_1
    groupRunnerUps[og.group_letter] = og.position_2
    officialPosition3ByGroup[og.group_letter] = og.position_3
  }

  // Build groups_key from official best thirds → look up matrix → resolve best_third slots
  const bestThirdTeamIds = ((officialBestThirdsResult.data ?? []) as { team_id: number }[])
    .map((r) => r.team_id)

  const serverSlots: Record<number, { a: number | null; b: number | null }> = {}

  if (bestThirdTeamIds.length === 8) {
    // Build sorted groups_key (e.g. "ACEFIJKL")
    const groupLetters = bestThirdTeamIds
      .map((id) => teamsById[id]?.group_letter)
      .filter(Boolean) as string[]
    const groupsKey = [...groupLetters].sort().join('')

    if (groupsKey.length === 8) {
      const matrixResult = await supabase
        .from('fifa_third_place_matrix')
        .select('*')
        .eq('groups_key', groupsKey)
        .maybeSingle()

      const matrixRow = matrixResult.data as FifaThirdPlaceMatrix | null

      if (matrixRow) {
        // Pre-resolve all best_third slots using the matrix and official position_3 data
        for (const match of template) {
          const aIsBestThird = match.slot_a_type === 'best_third'
          const bIsBestThird = match.slot_b_type === 'best_third'
          if (!aIsBestThird && !bIsBestThird) continue

          let a: number | null = null
          let b: number | null = null

          if (aIsBestThird) {
            const sourceGroup = getSourceGroup(matrixRow, match.slot_a_ref)
            if (sourceGroup) a = officialPosition3ByGroup[sourceGroup] ?? null
          }
          if (bIsBestThird) {
            const sourceGroup = getSourceGroup(matrixRow, match.slot_b_ref)
            if (sourceGroup) b = officialPosition3ByGroup[sourceGroup] ?? null
          }

          serverSlots[match.match_number] = { a, b }
        }
      }
    }
  }

  return (
    <BracketAdminClient
      adminId={user.id}
      template={template}
      teamsById={teamsById}
      initialResults={officialBracketMap}
      groupWinners={groupWinners}
      groupRunnerUps={groupRunnerUps}
      serverSlots={serverSlots}
    />
  )
}
