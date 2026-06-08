'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { BarChart3 } from 'lucide-react'
import { GroupCard } from '@/app/(app)/quiniela/grupos/_components/group-card'
import { createMutationClient } from '@/lib/supabase/client'
import type { SaveStatus } from '@/app/(app)/quiniela/grupos/_components/save-indicator'
import type { Team, OfficialGroupResult } from '@/lib/types/database.types'

interface GruposAdminClientProps {
  adminId: string
  teamsByGroup: Record<string, Team[]>
  officialsByGroup: Record<string, OfficialGroupResult>
}

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function GruposAdminClient({
  adminId,
  teamsByGroup,
  officialsByGroup,
}: GruposAdminClientProps) {
  // Initial order: from official result if it exists, else group_position order
  const [orders, setOrders] = useState<Record<string, number[]>>(() => {
    const initial: Record<string, number[]> = {}
    for (const letter of GROUP_LETTERS) {
      const official = officialsByGroup[letter]
      if (official) {
        initial[letter] = [official.position_1, official.position_2, official.position_3, official.position_4]
      } else {
        initial[letter] = (teamsByGroup[letter] ?? []).map((t) => t.id)
      }
    }
    return initial
  })

  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(() => {
    const s: Record<string, SaveStatus> = {}
    for (const letter of GROUP_LETTERS) s[letter] = 'idle'
    return s
  })

  const initLastSaved = (): Record<string, number[]> => {
    const s: Record<string, number[]> = {}
    for (const letter of GROUP_LETTERS) {
      const official = officialsByGroup[letter]
      s[letter] = official
        ? [official.position_1, official.position_2, official.position_3, official.position_4]
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
    const { error } = await supabase.from('official_group_results').upsert(
      {
        group_letter: groupLetter,
        position_1: order[0],
        position_2: order[1],
        position_3: order[2],
        position_4: order[3],
        recorded_by: adminId,
      },
      { onConflict: 'group_letter' },
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
  }, [orders, adminId])

  const savedCount = GROUP_LETTERS.filter((l) => (officialsByGroup[l] || lastSaved.current[l]?.length > 0)).length

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Resultados de grupos</h1>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {savedCount}/12 grupos guardados
        </span>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Arrastra los equipos para definir la posición final oficial de cada grupo.
      </p>

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
            locked={false}
            officialResult={null}
          />
        ))}
      </div>
    </div>
  )
}
