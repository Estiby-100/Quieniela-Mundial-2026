import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuinielaTabs } from '@/components/molecules/quiniela-tabs'
import { formatPhase } from '@/lib/utils'
import { Lock } from 'lucide-react'
import type { TournamentPhase } from '@/lib/types/database.types'

export default async function QuinielaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [configResult, grupCount, tercCount, brackCount, scorerResult] = await Promise.all([
    supabase.from('app_config').select('tournament_phase').eq('id', 1).single(),
    supabase.from('group_predictions').select('group_letter', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('best_third_predictions').select('team_id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('bracket_predictions').select('match_number', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('scorer_predictions').select('player_name').eq('user_id', user.id).maybeSingle(),
  ])

  const phase = (configResult.data as { tournament_phase: TournamentPhase } | null)?.tournament_phase ?? 'setup'
  const locked = phase !== 'predictions_open'
  const gruposCompleted = grupCount.count ?? 0
  const tercerosCompleted = tercCount.count ?? 0
  const bracketCompleted = brackCount.count ?? 0
  const goleadorDone = !!scorerResult.data

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-xl font-bold">Mi Quiniela</h1>
            {locked && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                {formatPhase(phase)}
              </span>
            )}
          </div>
          <QuinielaTabs
            gruposCompleted={gruposCompleted}
            tercerosCompleted={tercerosCompleted}
            bracketCompleted={bracketCompleted}
            goleadorDone={goleadorDone}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
