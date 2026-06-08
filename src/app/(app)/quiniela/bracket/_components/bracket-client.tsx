'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { MatchCard } from './match-card'
import { createMutationClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Team, BracketTemplate, MatchRound, TournamentPhase } from '@/lib/types/database.types'

interface BracketClientProps {
  userId: string
  template: BracketTemplate[]
  teamsById: Record<number, Team>
  initialPredictions: Record<number, number>
  groupWinners: Record<string, number>
  groupRunnerUps: Record<string, number>
  officialBracketMap: Record<number, number>
  phase: TournamentPhase
}

type ResolvedSlots = Record<number, { a: number | null; b: number | null }>

const ROUND_ORDER: MatchRound[] = ['r32', 'r16', 'qf', 'sf', 'final', 'third_place']
const ROUND_LABELS: Record<MatchRound, string> = {
  r32: 'Ronda 32', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', final: 'Final', third_place: '3er Lugar',
}

function resolveSlots(
  template: BracketTemplate[],
  predictions: Record<number, number>,
  groupWinners: Record<string, number>,
  groupRunnerUps: Record<string, number>,
): ResolvedSlots {
  const resolved: ResolvedSlots = {}
  const winnerOf: Record<number, number | null> = {}

  for (const match of template) {
    function resolveRef(slotType: string, slotRef: string): number | null {
      if (slotType === 'group_winner') return groupWinners[slotRef] ?? null
      if (slotType === 'group_runner_up') return groupRunnerUps[slotRef] ?? null
      if (slotType === 'best_third') return null // requires matrix — shown as TBD
      if (slotType === 'match_winner') {
        const mn = parseInt(slotRef, 10)
        return winnerOf[mn] ?? null
      }
      if (slotType === 'match_loser') {
        const mn = parseInt(slotRef, 10)
        const winner = winnerOf[mn]
        const slots = resolved[mn]
        if (winner && slots) {
          return winner === slots.a ? slots.b : slots.a
        }
        return null
      }
      return null
    }

    const a = resolveRef(match.slot_a_type, match.slot_a_ref)
    const b = resolveRef(match.slot_b_type, match.slot_b_ref)
    resolved[match.match_number] = { a, b }
    winnerOf[match.match_number] = predictions[match.match_number] ?? null
  }

  return resolved
}

export function BracketClient({
  userId, template, teamsById,
  initialPredictions, groupWinners, groupRunnerUps,
  officialBracketMap, phase,
}: BracketClientProps) {
  const locked = phase !== 'predictions_open'
  const [predictions, setPredictions] = useState<Record<number, number>>(initialPredictions)
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  const resolved = resolveSlots(template, predictions, groupWinners, groupRunnerUps)

  const invalidateDownstream = useCallback((matchNumber: number, current: Record<number, number>) => {
    const downstream = template.filter((t) =>
      ((t.slot_a_type === 'match_winner' || t.slot_a_type === 'match_loser') &&
        t.slot_a_ref === String(matchNumber)) ||
      ((t.slot_b_type === 'match_winner' || t.slot_b_type === 'match_loser') &&
        t.slot_b_ref === String(matchNumber)),
    )
    let updated = { ...current }
    for (const m of downstream) {
      delete updated[m.match_number]
      updated = invalidateDownstreamSync(m.match_number, updated, template)
    }
    return updated
  }, [template])

  function invalidateDownstreamSync(
    matchNumber: number,
    current: Record<number, number>,
    tmpl: BracketTemplate[],
  ): Record<number, number> {
    const downstream = tmpl.filter((t) =>
      ((t.slot_a_type === 'match_winner' || t.slot_a_type === 'match_loser') &&
        t.slot_a_ref === String(matchNumber)) ||
      ((t.slot_b_type === 'match_winner' || t.slot_b_type === 'match_loser') &&
        t.slot_b_ref === String(matchNumber)),
    )
    let updated = { ...current }
    for (const m of downstream) {
      delete updated[m.match_number]
      updated = invalidateDownstreamSync(m.match_number, updated, tmpl)
    }
    return updated
  }

  async function handleSelectWinner(matchNumber: number, winnerId: number) {
    // Optimistic update + cascade invalidation
    setPredictions((prev) => {
      const next = { ...prev, [matchNumber]: winnerId }
      return invalidateDownstream(matchNumber, next)
    })

    setSaving((prev) => ({ ...prev, [matchNumber]: true }))

    const supabase = createMutationClient()
    const { error } = await supabase.from('bracket_predictions').upsert(
      { user_id: userId, match_number: matchNumber, winner_id: winnerId },
      { onConflict: 'user_id,match_number' },
    )

    setSaving((prev) => ({ ...prev, [matchNumber]: false }))
    if (error) {
      toast.error(`Error al guardar M${matchNumber}: ${error.message}`)
      // Roll back
      setPredictions((prev) => {
        const next = { ...prev }
        delete next[matchNumber]
        return next
      })
    }
  }

  const templateByRound = template.reduce<Record<string, BracketTemplate[]>>((acc, t) => {
    acc[t.round] = acc[t.round] ?? []
    acc[t.round].push(t)
    return acc
  }, {})

  const rounds = ROUND_ORDER.filter((r) => templateByRound[r]?.length > 0)

  return (
    <div className="p-4">
      <Tabs defaultValue={rounds[0] ?? 'r32'}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {rounds.map((round) => {
            const matches = templateByRound[round] ?? []
            const done = matches.filter((m) => predictions[m.match_number] != null).length
            return (
              <TabsTrigger key={round} value={round} className="text-xs gap-1.5">
                {ROUND_LABELS[round]}
                <span className={cn(
                  'text-[10px] font-mono px-1 rounded',
                  done === matches.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted',
                )}>
                  {done}/{matches.length}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {rounds.map((round) => (
          <TabsContent key={round} value={round}>
            <ScrollArea>
              <div className={cn(
                'grid gap-3',
                round === 'r32' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 max-w-lg',
              )}>
                {(templateByRound[round] ?? []).map((match) => {
                  const slots = resolved[match.match_number]
                  return (
                    <MatchCard
                      key={match.match_number}
                      matchNumber={match.match_number}
                      round={match.round}
                      teamA={slots?.a ? teamsById[slots.a] ?? null : null}
                      teamB={slots?.b ? teamsById[slots.b] ?? null : null}
                      selectedWinner={predictions[match.match_number] ?? null}
                      officialWinner={officialBracketMap[match.match_number] ?? null}
                      onSelectWinner={(id) => handleSelectWinner(match.match_number, id)}
                      locked={locked}
                      saving={saving[match.match_number]}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
