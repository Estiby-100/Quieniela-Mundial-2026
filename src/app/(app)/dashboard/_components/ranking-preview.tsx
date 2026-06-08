'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface StandingRow {
  user_id: string
  total_points: number
  points_groups: number
  points_thirds: number
  points_bracket: number
  points_scorer: number
}

interface Profile {
  id: string
  full_name: string | null
}

interface RankingPreviewProps {
  topStandings: StandingRow[]
  profiles: Profile[]
  userId: string
  userPosition: number | null
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const positionColors: Record<number, string> = {
  1: 'text-amber-400 font-bold',
  2: 'text-slate-300 font-semibold',
  3: 'text-amber-600 font-semibold',
}

export function RankingPreview({ topStandings, profiles, userId, userPosition }: RankingPreviewProps) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const top5 = topStandings.slice(0, 5)

  if (top5.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            El ranking se actualizará cuando el torneo comience.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Ranking — Top 5
          </CardTitle>
          {userPosition && userPosition > 5 && (
            <span className="text-xs text-muted-foreground">Tu posición: #{userPosition}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pb-3">
        {top5.map((standing, idx) => {
          const position = idx + 1
          const profile = profileMap.get(standing.user_id)
          const isMe = standing.user_id === userId
          const name = profile?.full_name ?? 'Participante'

          return (
            <div
              key={standing.user_id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isMe ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
              )}
            >
              {/* Position */}
              <span className={cn('w-5 text-center text-sm tabular-nums', positionColors[position] ?? 'text-muted-foreground')}>
                {position}
              </span>

              {/* Avatar */}
              <Avatar className="h-7 w-7 text-xs">
                <AvatarFallback className={cn('text-xs', isMe && 'bg-primary text-primary-foreground')}>
                  {getInitials(profile?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <span className={cn('flex-1 text-sm truncate', isMe && 'font-semibold')}>
                {name}
                {isMe && <span className="ml-1 text-xs text-muted-foreground">(tú)</span>}
              </span>

              {/* Points */}
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {standing.total_points}
                <span className="ml-0.5 text-xs text-muted-foreground font-normal">pts</span>
              </span>
            </div>
          )
        })}
      </CardContent>

      <div className="px-4 pb-4">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/app/ranking">Ver ranking completo</Link>
        </Button>
      </div>
    </Card>
  )
}
