import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecalcularClient } from './_components/recalcular-client'
import type { Standing } from '@/lib/types/database.types'

export default async function AdminRecalcularPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [standingsResult, historyResult] = await Promise.all([
    supabase.from('standings').select('user_id, total_points, last_recalculated_at')
      .order('total_points', { ascending: false }),
    supabase.from('ranking_history')
      .select('recalculation_id, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(5),
  ])

  const standings = (standingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points' | 'last_recalculated_at'>[]
  const lastRecalcAt = standings.find((s) => s.last_recalculated_at)?.last_recalculated_at ?? null

  const historyRows = (historyResult.data ?? []) as { recalculation_id: string; recorded_at: string }[]
  const uniqueRecalcs = Array.from(
    new Map(historyRows.map((r) => [r.recalculation_id, r])).values()
  )

  return (
    <RecalcularClient
      adminId={user.id}
      totalParticipants={standings.length}
      lastRecalcAt={lastRecalcAt}
      recentRecalcs={uniqueRecalcs}
    />
  )
}
