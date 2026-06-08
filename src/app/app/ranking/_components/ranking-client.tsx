'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DeltaBadge } from '@/components/atoms/delta-badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { StandingWithProfile } from '@/lib/types/app.types'
import type { TournamentPhase } from '@/lib/types/database.types'

type FilterKey = 'general' | 'grupos' | 'bracket' | 'goleador'

const FILTERS: { key: FilterKey; label: string; field: keyof StandingWithProfile }[] = [
  { key: 'general', label: 'General', field: 'total_points' },
  { key: 'grupos', label: 'Grupos', field: 'points_groups' },
  { key: 'bracket', label: 'Bracket', field: 'points_bracket' },
  { key: 'goleador', label: 'Goleador', field: 'points_scorer' },
]

interface RankingClientProps {
  userId: string
  standings: StandingWithProfile[]
  phase: TournamentPhase
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function RankingClient({ userId, standings, phase: _phase }: RankingClientProps) {
  const [filter, setFilter] = useState<FilterKey>('general')
  const [expanded, setExpanded] = useState<string | null>(null)

  const sortedStandings = [...standings].sort((a, b) => {
    const field = FILTERS.find((f) => f.key === filter)?.field ?? 'total_points'
    return (b[field] as number) - (a[field] as number)
  })

  const leader = sortedStandings[0]
  const leaderPoints = leader
    ? ((leader[FILTERS.find((f) => f.key === filter)?.field ?? 'total_points']) as number)
    : 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-0 border-b border-border sticky top-0 bg-background z-10">
        <h1 className="text-xl font-bold mb-3">Ranking</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList className="mb-0">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium">El ranking se actualizará cuando comience el torneo.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sortedStandings.map((s, i) => {
            const position = i + 1
            const isMe = s.user_id === userId
            const isExpanded = expanded === s.user_id
            const currentPoints = (s[FILTERS.find((f) => f.key === filter)?.field ?? 'total_points']) as number
            const pct = leaderPoints > 0 ? (currentPoints / leaderPoints) * 100 : 0

            return (
              <div key={s.user_id} className={cn(isMe && 'bg-primary/5')}>
                {/* Main row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpanded(isExpanded ? null : s.user_id)}
                >
                  {/* Position */}
                  <div className="w-8 shrink-0 text-center">
                    <span className={cn(
                      'text-sm font-bold font-mono',
                      position === 1 && 'text-yellow-400',
                      position === 2 && 'text-slate-400',
                      position === 3 && 'text-amber-600',
                    )}>
                      {position}
                    </span>
                  </div>

                  {/* Delta */}
                  <div className="w-10 shrink-0">
                    <DeltaBadge delta={s.delta} />
                  </div>

                  {/* Avatar + name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(
                        'text-xs font-semibold',
                        isMe ? 'bg-primary/20 text-primary' : 'bg-muted',
                      )}>
                        {getInitials(s.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                        {s.full_name ?? 'Sin nombre'}
                        {isMe && <span className="ml-1 text-xs font-normal opacity-60">(tú)</span>}
                      </p>
                      <Progress value={pct} className="h-1 mt-1 w-20" />
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold tabular-nums">
                      {currentPoints}
                    </span>
                    <span className="text-xs text-muted-foreground">pts</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-3 pl-[4.5rem] bg-muted/30">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                      {[
                        { label: 'Grupos', pts: s.points_groups },
                        { label: 'Bracket', pts: s.points_bracket },
                        { label: 'Mejores 3ros', pts: s.points_thirds },
                        { label: 'Goleador', pts: s.points_scorer },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-mono font-medium">{item.pts}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/app/predicciones/${s.user_id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver quiniela <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
