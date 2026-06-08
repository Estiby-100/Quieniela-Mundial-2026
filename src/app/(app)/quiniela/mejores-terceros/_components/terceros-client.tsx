'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Info, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResultIcon } from '@/components/atoms/result-icon'
import { createMutationClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Team, TournamentPhase } from '@/lib/types/database.types'

interface TercerosClientProps {
  userId: string
  teamsById: Record<number, Team>
  position3Ids: number[]
  initialSelected: number[]
  groupsCompleted: number
  phase: TournamentPhase
  officialThirdIds: number[]
}

function countryToFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join('')
}

export function TercerosClient({
  userId,
  teamsById,
  position3Ids,
  initialSelected,
  groupsCompleted,
  phase,
  officialThirdIds,
}: TercerosClientProps) {
  const locked = phase !== 'predictions_open'
  const [selected, setSelected] = useState<number[]>(initialSelected)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const groupsPending = 12 - groupsCompleted
  const availableTeams = position3Ids
    .map((id) => teamsById[id])
    .filter(Boolean) as Team[]

  function handleToggle(teamId: number) {
    if (locked) return
    if (selected.includes(teamId)) {
      setSelected((prev) => prev.filter((id) => id !== teamId))
      setSaved(false)
    } else if (selected.length < 8) {
      setSelected((prev) => [...prev, teamId])
      setSaved(false)
    } else {
      toast.warning('Máximo 8 mejores terceros. Quita uno antes de agregar otro.')
    }
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createMutationClient()

    // Delete all existing, then insert selected
    const { error: delError } = await supabase
      .from('best_third_predictions')
      .delete()
      .eq('user_id', userId)

    if (delError) {
      toast.error(`Error: ${delError.message}`)
      setSaving(false)
      return
    }

    if (selected.length > 0) {
      const { error: insError } = await supabase
        .from('best_third_predictions')
        .insert(selected.map((team_id) => ({ user_id: userId, team_id })))
      if (insError) {
        toast.error(`Error: ${insError.message}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      {groupsPending > 0 && !locked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Completa tus predicciones de grupos para ver los equipos disponibles.{' '}
            <strong>{groupsPending} grupo{groupsPending !== 1 ? 's' : ''} pendiente{groupsPending !== 1 ? 's' : ''}.</strong>
          </span>
        </div>
      )}

      {/* Available teams */}
      {!locked && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Disponibles — tus equipos en 3er lugar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {availableTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Llena tus grupos para ver los equipos en 3er lugar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTeams.map((team) => {
                  const isSelected = selected.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      onClick={() => handleToggle(team.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors',
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'border-border hover:border-muted-foreground',
                        selected.length >= 8 && !isSelected
                          ? 'opacity-40 cursor-not-allowed'
                          : 'cursor-pointer',
                      )}
                      disabled={selected.length >= 8 && !isSelected}
                    >
                      <span>{countryToFlag(team.fifa_code)}</span>
                      <span>{team.name}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected teams */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {locked ? 'Tus seleccionados' : `Tus seleccionados (${selected.length}/8)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No has seleccionado ningún equipo aún.
            </p>
          ) : (
            <div className="space-y-2">
              {selected.map((teamId) => {
                const team = teamsById[teamId]
                if (!team) return null
                const isOfficial = officialThirdIds.includes(teamId)
                return (
                  <div
                    key={teamId}
                    className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-base">{countryToFlag(team.fifa_code)}</span>
                    <span className="flex-1 text-sm font-medium">{team.name}</span>
                    {locked && officialThirdIds.length > 0 && (
                      <ResultIcon status={isOfficial ? 'correct' : 'wrong'} />
                    )}
                    {!locked && (
                      <button
                        onClick={() => handleToggle(teamId)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                        aria-label={`Quitar ${team.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!locked && (
        <div className="flex items-center gap-3 pb-4">
          <Button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar selección'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              Guardado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
