'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SaveIndicator, type SaveStatus } from './save-indicator'
import { ResultIcon } from '@/components/atoms/result-icon'
import { cn } from '@/lib/utils'
import type { Team, OfficialGroupResult } from '@/lib/types/database.types'

interface GroupCardProps {
  groupLetter: string
  teams: Team[]
  order: number[] | null
  onOrderChange: (order: number[]) => void
  onSave: () => void
  saveStatus: SaveStatus
  locked: boolean
  officialResult: OfficialGroupResult | null
}

const POSITION_LABELS = ['1º', '2º', '3º', '4º']

function SortableTeamRow({
  team,
  position,
  locked,
  resultStatus,
}: {
  team: Team
  position: number
  locked: boolean
  resultStatus: 'correct' | 'wrong' | 'pending' | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(team.id),
    disabled: locked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-md transition-colors',
        isDragging ? 'bg-accent shadow-lg' : 'hover:bg-muted/50',
        locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
        {POSITION_LABELS[position]}
      </span>

      {!locked && (
        <button
          className="text-muted-foreground hover:text-foreground touch-none shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <span className="text-base shrink-0">{countryToFlag(team.fifa_code)}</span>
      <span className="text-sm font-medium flex-1 truncate">{team.name}</span>

      {resultStatus !== null && (
        <ResultIcon status={resultStatus} />
      )}
    </div>
  )
}

function countryToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65))
    .join('')
}

export function GroupCard({
  groupLetter,
  teams,
  order,
  onOrderChange,
  onSave,
  saveStatus,
  locked,
  officialResult,
}: GroupCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const currentOrder = order ?? teams.map((t) => t.id)
  const orderedTeams = currentOrder
    .map((id) => teams.find((t) => t.id === id))
    .filter(Boolean) as Team[]

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = currentOrder.findIndex((id) => String(id) === active.id)
    const newIndex = currentOrder.findIndex((id) => String(id) === over.id)
    const newOrder = arrayMove(currentOrder, oldIndex, newIndex)
    onOrderChange(newOrder)
  }

  function getResultStatus(team: Team, position: number): 'correct' | 'wrong' | 'pending' | null {
    if (!officialResult) return null
    const officialPos = [
      officialResult.position_1,
      officialResult.position_2,
      officialResult.position_3,
      officialResult.position_4,
    ]
    if (officialPos[position] === team.id) return 'correct'
    // For positions 1&2: "wrong position but qualified" also gives points
    if (position <= 1 && (officialPos[0] === team.id || officialPos[1] === team.id)) return 'wrong'
    return 'wrong'
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Grupo {groupLetter}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentOrder.map(String)}
            strategy={verticalListSortingStrategy}
          >
            {orderedTeams.map((team, i) => (
              <SortableTeamRow
                key={team.id}
                team={team}
                position={i}
                locked={locked}
                resultStatus={locked ? getResultStatus(team, i) : null}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="px-1">
          <SaveIndicator
            status={saveStatus}
            onSave={onSave}
            onRetry={onSave}
          />
        </div>
      </CardContent>
    </Card>
  )
}
