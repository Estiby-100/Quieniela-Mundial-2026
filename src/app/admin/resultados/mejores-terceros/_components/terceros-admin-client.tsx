'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Info, Loader2, Check, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createMutationClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Team } from '@/lib/types/database.types'

interface TercerosAdminClientProps {
  adminId: string
  teamsById: Record<number, Team>
  position3Ids: number[]
  initialSelected: number[]
  groupsWithResults: number
}


export function TercerosAdminClient({
  adminId,
  teamsById,
  position3Ids,
  initialSelected,
  groupsWithResults,
}: TercerosAdminClientProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>(initialSelected)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const groupsPending = 12 - groupsWithResults
  const availableTeams = position3Ids
    .map((id) => teamsById[id])
    .filter(Boolean) as Team[]

  function handleToggle(teamId: number) {
    setSaved(false)
    if (selected.includes(teamId)) {
      setSelected((prev) => prev.filter((id) => id !== teamId))
    } else if (selected.length < 8) {
      setSelected((prev) => [...prev, teamId])
    } else {
      toast.warning('Máximo 8 mejores terceros. Quita uno antes de agregar otro.')
    }
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createMutationClient()

    const { error: delError } = await supabase
      .from('official_best_thirds')
      .delete()
      .neq('team_id', 0) // delete all rows

    if (delError) {
      toast.error(`Error al limpiar: ${delError.message}`)
      setSaving(false)
      return
    }

    if (selected.length > 0) {
      const { error: insError } = await supabase
        .from('official_best_thirds')
        .insert(selected.map((team_id) => ({ team_id, recorded_by: adminId })))
      if (insError) {
        toast.error(`Error al guardar: ${insError.message}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
    toast.success('Mejores terceros guardados')
  }

  return (
    <div className="px-4 py-6 space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Mejores terceros</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Selecciona los 8 equipos que clasificaron como mejores terceros.
      </p>

      {/* Warning if groups not complete */}
      {groupsPending > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {groupsPending === 12
              ? 'No hay resultados de grupos guardados. Se muestran todos los equipos como pool provisional.'
              : `Faltan ${groupsPending} grupo${groupsPending !== 1 ? 's' : ''} con resultado oficial. El pool puede estar incompleto.`}
          </span>
        </div>
      )}

      {/* Available pool */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Equipos en 3er lugar — {groupsWithResults} grupos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {availableTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Guarda los resultados de grupos para ver los equipos disponibles.
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
                    <span>{team.name}</span>
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clasificados ({selected.length}/8)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No hay ningún equipo seleccionado aún.
            </p>
          ) : (
            <div className="space-y-2">
              {selected.map((teamId) => {
                const team = teamsById[teamId]
                if (!team) return null
                return (
                  <div
                    key={teamId}
                    className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="flex-1 text-sm font-medium">{team.name}</span>
                    <button
                      onClick={() => handleToggle(teamId)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                      aria-label={`Quitar ${team.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar clasificados'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            Guardado
          </span>
        )}
      </div>
    </div>
  )
}
