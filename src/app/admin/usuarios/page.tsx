import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsuariosClient } from './_components/usuarios-client'
import type { Profile, Standing } from '@/lib/types/database.types'

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profilesResult, standingsResult, groupPredsResult, bracketPredsResult, scorerPredsResult] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('standings').select('user_id, total_points, points_groups, points_thirds, points_bracket, points_scorer, last_recalculated_at'),
      supabase.from('group_predictions').select('user_id').order('user_id'),
      supabase.from('bracket_predictions').select('user_id').order('user_id'),
      supabase.from('scorer_predictions').select('user_id'),
    ])

  const profiles = (profilesResult.data ?? []) as Profile[]
  const standings = (standingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points' | 'points_groups' | 'points_thirds' | 'points_bracket' | 'points_scorer' | 'last_recalculated_at'>[]
  const standingsById = Object.fromEntries(standings.map((s) => [s.user_id, s]))

  // Count predictions per user
  const groupCountByUser: Record<string, number> = {}
  for (const r of (groupPredsResult.data ?? []) as { user_id: string }[]) {
    groupCountByUser[r.user_id] = (groupCountByUser[r.user_id] ?? 0) + 1
  }
  const bracketUserIds = new Set((bracketPredsResult.data ?? []).map((r: { user_id: string }) => r.user_id))
  const scorerUserIds = new Set((scorerPredsResult.data ?? []).map((r: { user_id: string }) => r.user_id))

  return (
    <UsuariosClient
      currentUserId={user.id}
      profiles={profiles}
      standingsById={standingsById}
      groupCountByUser={groupCountByUser}
      bracketUserIds={[...bracketUserIds]}
      scorerUserIds={[...scorerUserIds]}
    />
  )
}
