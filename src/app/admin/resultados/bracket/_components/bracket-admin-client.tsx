'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createMutationClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Trophy, Loader2, Check, Users } from 'lucide-react'
import type { Team, BracketTemplate, MatchRound } from '@/lib/types/database.types'

interface BracketAdminClientProps {
  adminId: string
  template: BracketTemplate[]
  teamsById: Record<number, Team>
  initialResults: Record<number, number>
  groupWinners: Record<string, number>
  groupRunnerUps: Record<string, number>
}

type ResolvedSlots = Record<number, { a: number | null; b: number | null }>

interface MatchStats {
  correct: number
  wrong: number
  total: number
}

const ROUND_ORDER: MatchRound[] = ['r32', 'r16', 'qf', 'sf', 'final', 'third_place']
const ROUND_LABELS: Record<MatchRound, string> = {
  r32: 'Ronda 32', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', final: 'Final', third_place: '3er Lugar',
}

function resolveSlots(
  template: BracketTemplate[],
  results: Record<number, number>,
  groupWinners: Record<string, number>,
  groupRunnerUps: Record<string, number>,
): ResolvedSlots {
  const resolved: ResolvedSlots = {}
  const winnerOf: Record<number, number | null> = {}

  for (const match of template) {
    function resolveRef(slotType: string, slotRef: string): number | null {
      if (slotType === 'group_winner') return groupWinners[slotRef] ?? null
      if (slotType === 'group_runner_up') return groupRunnerUps[slotRef] ?? null
      if (slotType === 'best_third') return null
      if (slotType === 'match_winner') {
        const mn = parseInt(slotRef, 10)
        return winnerOf[mn] ?? null
      }
      if (slotType === 'match_loser') {
        const mn = parseInt(slotRef, 10)
        const winner = winnerOf[mn]
        const slots = resolved[mn]
        if (winner && slots) return winner === slots.a ? slots.b : slots.a
        return null
      }
      return null
    }

    const a = resolveRef(match.slot_a_type, match.slot_a_ref)
    const b = resolveRef(match.slot_b_type, match.slot_b_ref)
    resolved[match.match_number] = { a, b }
    winnerOf[match.match_number] = results[match.match_number] ?? null
  }

  return resolved
}

function countryToFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join('')
}

// ──────────────────────────────────────────────────────────────────────────────
// AdminMatchCard
// ──────────────────────────────────────────────────────────────────────────────

interface AdminMatchCardProps {
  matchNumber: number
  round: MatchRound
  teamA: Team | null
  teamB: Team | null
  officialWinner: number | null
  stats: MatchStats | null
  saving: boolean
  onSelectWinner: (winnerId: number) => void
}

function AdminMatchCard({
  matchNumber, round, teamA, teamB,
  officialWinner, stats, saving, onSelectWinner,
}: AdminMatchCardProps) {
  const isFinal = round === 'final' || round === 'third_place'
  const pending = !teamA || !teamB
  const hasSaved = officialWinner !== null

  function TeamButton({ team }: { team: Team | null }) {
    if (!team) {
      return (
        <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm text-muted-foreground/50 italic">
          <span className="text-base opacity-30">?</span>
          Por determinar
        </div>
      )
    }
    const isWinner = officialWinner === team.id
    return (
      <button
        onClick={() => !pending && onSelectWinner(team.id)}
        disabled={pending}
        className={cn(
          'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left text-sm font-medium transition-all border',
          isWinner
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
            : 'border-transparent hover:bg-muted/60 hover:border-border/60',
          pending && 'opacity-40 cursor-not-allowed',
        )}
      >
        <span className="text-lg shrink-0">{countryToFlag(team.fifa_code)}</span>
        <span className="flex-1 truncate">{team.name}</span>
        {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
      </button>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card text-card-foreground flex flex-col overflow-hidden',
      isFinal && 'border-primary/40 shadow-md shadow-primary/10',
      hasSaved && !isFinal && 'border-emerald-500/20',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-mono font-bold text-muted-foreground">M{matchNumber}</span>
        <span className={cn(
          'text-xs font-semibold tracking-wide',
          isFinal ? 'text-primary' : 'text-muted-foreground',
        )}>
          {ROUND_LABELS[round]}
        </span>
        {saving
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          : hasSaved
            ? <Check className="h-3.5 w-3.5 text-emerald-400" />
            : <span className="h-3.5 w-3.5" />}
      </div>

      {/* Team buttons */}
      <div className="p-2 space-y-1 flex-1">
        <TeamButton team={teamA} />
        <div className="flex items-center gap-2 px-3 py-0.5">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] text-muted-foreground font-mono tracking-widest">VS</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        <TeamButton team={teamB} />
      </div>

      {/* Stats after save */}
      {stats !== null && (
        <div className="flex items-center gap-3 px-3 py-2 border-t border-border bg-muted/30">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-emerald-400 font-medium">
            {stats.correct} acertaron
          </span>
          <span className="text-xs text-muted-foreground">
            {stats.wrong} fallaron
          </span>
          {stats.total > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {Math.round((stats.correct / stats.total) * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// BracketAdminClient
// ──────────────────────────────────────────────────────────────────────────────

export function BracketAdminClient({
  adminId,
  template,
  teamsById,
  initialResults,
  groupWinners,
  groupRunnerUps,
}: BracketAdminClientProps) {
  const [results, setResults] = useState<Record<number, number>>(initialResults)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [stats, setStats] = useState<Record<number, MatchStats>>({})

  const resolved = resolveSlots(template, results, groupWinners, groupRunnerUps)

  const templateByRound = template.reduce<Record<string, BracketTemplate[]>>((acc, t) => {
    acc[t.round] = acc[t.round] ?? []
    acc[t.round].push(t)
    return acc
  }, {})

  const rounds = ROUND_ORDER.filter((r) => templateByRound[r]?.length > 0)

  async function handleSelectWinner(matchNumber: number, winnerId: number) {
    // Optimistic update
    setResults((prev) => ({ ...prev, [matchNumber]: winnerId }))
    setSaving((prev) => ({ ...prev, [matchNumber]: true }))

    const supabase = createMutationClient()
    const { error: saveError } = await supabase
      .from('official_bracket_results')
      .upsert(
        { match_number: matchNumber, winner_id: winnerId, recorded_by: adminId },
        { onConflict: 'match_number' },
      )

    if (saveError) {
      toast.error(`Error al guardar M${matchNumber}: ${saveError.message}`)
      setResults((prev) => {
        const next = { ...prev }
        delete next[matchNumber]
        return next
      })
      setSaving((prev) => ({ ...prev, [matchNumber]: false }))
      return
    }

    // Fetch stats: how many participants predicted this match winner
    const { data: preds } = await supabase
      .from('bracket_predictions')
      .select('winner_id')
      .eq('match_number', matchNumber)

    const predRows = (preds ?? []) as { winner_id: number }[]
    const correct = predRows.filter((p) => p.winner_id === winnerId).length
    const wrong = predRows.filter((p) => p.winner_id !== winnerId).length

    setStats((prev) => ({ ...prev, [matchNumber]: { correct, wrong, total: predRows.length } }))
    setSaving((prev) => ({ ...prev, [matchNumber]: false }))
    toast.success(`M${matchNumber} guardado`)
  }

  const totalSaved = Object.keys(results).length
  const totalMatches = template.length

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Resultados del bracket</h1>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {totalSaved}/{totalMatches} partidos guardados
        </span>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Toca el equipo ganador para registrar el resultado oficial.
      </p>

      <Tabs defaultValue={rounds[0] ?? 'r32'}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {rounds.map((round) => {
            const matches = templateByRound[round] ?? []
            const done = matches.filter((m) => results[m.match_number] != null).length
            return (
              <TabsTrigger key={round} value={round} className="text-xs gap-1.5">
                {ROUND_LABELS[round]}
                <span className={cn(
                  'text-[10px] font-mono px-1 rounded',
                  done === matches.length && matches.length > 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-muted',
                )}>
                  {done}/{matches.length}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {rounds.map((round) => (
          <TabsContent key={round} value={round}>
            <div className={cn(
              'grid gap-3',
              round === 'r32'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 max-w-2xl',
            )}>
              {(templateByRound[round] ?? []).map((match) => {
                const slots = resolved[match.match_number]
                return (
                  <AdminMatchCard
                    key={match.match_number}
                    matchNumber={match.match_number}
                    round={match.round}
                    teamA={slots?.a ? (teamsById[slots.a] ?? null) : null}
                    teamB={slots?.b ? (teamsById[slots.b] ?? null) : null}
                    officialWinner={results[match.match_number] ?? null}
                    stats={stats[match.match_number] ?? null}
                    saving={!!saving[match.match_number]}
                    onSelectWinner={(id) => handleSelectWinner(match.match_number, id)}
                  />
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
