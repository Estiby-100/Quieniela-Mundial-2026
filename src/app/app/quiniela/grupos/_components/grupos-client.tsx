'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { GroupCard } from './group-card'
import { createMutationClient } from '@/lib/supabase/client'
import type { SaveStatus } from './save-indicator'
import type { Team, GroupPrediction, OfficialGroupResult, TournamentPhase } from '@/lib/types/database.types'

interface GruposClientProps {
  userId: string
  teamsByGroup: Record<string, Team[]>
  predsByGroup: Record<string, GroupPrediction>
  officialsByGroup: Record<string, OfficialGroupResult>
  phase: TournamentPhase
}

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function GruposClient({
  userId,
  teamsByGroup,
  predsByGroup,
  officialsByGroup,
  phase,
}: GruposClientProps) {
  const locked = phase !== 'predictions_open'

  // order: group letter → array of team IDs (positions 1-4)
  const [orders, setOrders] = useState<Record<string, number[]>>(() => {
    const initial: Record<string, number[]> = {}
    for (const letter of GROUP_LETTERS) {
      const pred = predsByGroup[letter]
      if (pred) {
        initial[letter] = [pred.position_1, pred.position_2, pred.position_3, pred.position_4]
      } else {
        initial[letter] = (teamsByGroup[letter] ?? []).map((t) => t.id)
      }
    }
    return initial
  })

  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(() => {
    const initial: Record<string, SaveStatus> = {}
    for (const letter of GROUP_LETTERS) initial[letter] = 'idle'
    return initial
  })

  // Track what was last saved (to detect unsaved changes)
  const initLastSaved = (): Record<string, number[]> => {
    const s: Record<string, number[]> = {}
    for (const letter of GROUP_LETTERS) {
      const pred = predsByGroup[letter]
      s[letter] = pred
        ? [pred.position_1, pred.position_2, pred.position_3, pred.position_4]
        : []
    }
    return s
  }
  const lastSaved = useRef<Record<string, number[]>>(initLastSaved())

  const handleOrderChange = useCallback((groupLetter: string, newOrder: number[]) => {
    setOrders((prev) => ({ ...prev, [groupLetter]: newOrder }))
    setSaveStatuses((prev) => ({ ...prev, [groupLetter]: 'unsaved' }))
  }, [])

  const handleSave = useCallback(async (groupLetter: string) => {
    const order = orders[groupLetter]
    if (!order || order.length !== 4) return

    setSaveStatuses((prev) => ({ ...prev, [groupLetter]: 'saving' }))

    const supabase = createMutationClient()
    const { error } = await supabase.from('group_predictions').upsert(
      {
        user_id: userId,
        group_letter: groupLetter,
        position_1: order[0],
        position_2: order[1],
        position_3: order[2],
        position_4: order[3],
      },
      { onConflict: 'user_id,group_letter' },
    )

    if (error) {
      toast.error(`Error al guardar Grupo ${groupLetter}: ${error.message}`)
      setSaveStatuses((prev) => ({ ...prev, [groupLetter]: 'error' }))
    } else {
      lastSaved.current[groupLetter] = order
      setSaveStatuses((prev) => ({ ...prev, [groupLetter]: 'saved' }))
      setTimeout(
        () => setSaveStatuses((prev) => ({ ...prev, [groupLetter]: 'idle' })),
        2000,
      )
    }
  }, [orders, userId])

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GROUP_LETTERS.map((letter) => (
          <GroupCard
            key={letter}
            groupLetter={letter}
            teams={teamsByGroup[letter] ?? []}
            order={orders[letter] ?? null}
            onOrderChange={(newOrder) => handleOrderChange(letter, newOrder)}
            onSave={() => handleSave(letter)}
            saveStatus={saveStatuses[letter] ?? 'idle'}
            locked={locked}
            officialResult={officialsByGroup[letter] ?? null}
          />
        ))}
      </div>
    </div>
  )
}
