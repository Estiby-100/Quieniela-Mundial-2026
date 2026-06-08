import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { UserContext } from '@/lib/types/app.types'
import type { Profile, Standing } from '@/lib/types/database.types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, standingResult, allStandingsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, is_admin').eq('id', user.id).single(),
    supabase.from('standings').select('total_points').eq('user_id', user.id).single(),
    supabase
      .from('standings')
      .select('user_id, total_points')
      .order('total_points', { ascending: false }),
  ])

  const profile = profileResult.data as Pick<Profile, 'full_name' | 'is_admin'> | null
  const standing = standingResult.data as Pick<Standing, 'total_points'> | null
  const allStandings = (allStandingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points'>[]

  const position = standing ? allStandings.findIndex((s) => s.user_id === user.id) + 1 : null

  const userContext: UserContext = {
    id: user.id,
    full_name: profile?.full_name ?? null,
    is_admin: profile?.is_admin ?? false,
    standing:
      standing && position ? { total_points: standing.total_points, position } : null,
  }

  return <AppShell userContext={userContext}>{children}</AppShell>
}
