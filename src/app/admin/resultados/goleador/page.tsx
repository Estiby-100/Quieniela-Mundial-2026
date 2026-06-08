import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoleadorAdminClient } from './_components/goleador-admin-client'
import type { Team, OfficialTopScorer } from '@/lib/types/database.types'

export default async function AdminResultadosGoleadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [teamsResult, officialResult] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('official_top_scorer').select('*').eq('id', 1).maybeSingle(),
  ])

  return (
    <GoleadorAdminClient
      adminId={user.id}
      teams={(teamsResult.data ?? []) as Team[]}
      initial={(officialResult.data as OfficialTopScorer | null)}
    />
  )
}
