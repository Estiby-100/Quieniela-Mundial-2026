'use client'

import { Loader2 } from 'lucide-react'
import { ResultIcon } from '@/components/atoms/result-icon'
import { cn } from '@/lib/utils'
import type { Team, MatchRound } from '@/lib/types/database.types'

interface MatchCardProps {
  matchNumber: number
  round: MatchRound
  teamA: Team | null
  teamB: Team | null
  selectedWinner: number | null
  officialWinner: number | null
  onSelectWinner: (winnerId: number) => void
  locked: boolean
  saving?: boolean
}

function countryToFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join('')
}

const ROUND_LABELS: Record<MatchRound, string> = {
  r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3er lugar', final: 'Final',
}

export function MatchCard({
  matchNumber, round, teamA, teamB,
  selectedWinner, officialWinner, onSelectWinner, locked, saving,
}: MatchCardProps) {
  const pending = !teamA || !teamB
  const isFinal = round === 'final' || round === 'third_place'

  function teamRow(team: Team | null, isSelected: boolean, isOfficialWinner: boolean) {
    if (!team) {
      return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md text-muted-foreground">
          <span className="text-base opacity-30">?</span>
          <span className="text-sm italic">Por determinar</span>
        </div>
      )
    }

    const showResult = locked && officialWinner !== null
    const resultStatus = showResult
      ? isSelected && isOfficialWinner ? 'correct'
        : isSelected && !isOfficialWinner ? 'wrong'
        : null
      : null

    return (
      <button
        onClick={() => !locked && !pending && onSelectWinner(team.id)}
        disabled={locked || pending}
        className={cn(
          'flex items-center gap-2 w-full py-2 px-3 rounded-md text-left transition-colors',
          !locked && !pending && 'hover:bg-muted cursor-pointer',
          locked && 'cursor-default',
          isSelected && !locked && 'bg-primary/20 text-primary',
          isSelected && locked && isOfficialWinner && 'bg-emerald-500/10',
          isSelected && locked && !isOfficialWinner && 'bg-destructive/10',
          pending && 'opacity-50',
        )}
      >
        <span className="text-base shrink-0">{countryToFlag(team.fifa_code)}</span>
        <span className={cn('text-sm font-medium flex-1', isSelected && !locked && 'font-semibold')}>
          {team.name}
        </span>
        {resultStatus && <ResultIcon status={resultStatus} />}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground',
        isFinal && 'border-primary/40 shadow-sm shadow-primary/10',
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">M{matchNumber}</span>
        <span className={cn(
          'text-xs font-semibold',
          isFinal ? 'text-primary' : 'text-muted-foreground',
        )}>
          {ROUND_LABELS[round]}
        </span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <div className="p-1">
        {teamRow(teamA, selectedWinner === teamA?.id, officialWinner === teamA?.id)}
        <div className="flex items-center gap-2 px-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground font-mono">VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {teamRow(teamB, selectedWinner === teamB?.id, officialWinner === teamB?.id)}
      </div>
    </div>
  )
}
