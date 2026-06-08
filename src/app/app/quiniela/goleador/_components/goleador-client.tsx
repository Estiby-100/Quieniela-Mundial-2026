'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ResultIcon } from '@/components/atoms/result-icon'
import { createMutationClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Team, ScorerPrediction, OfficialTopScorer, TournamentPhase } from '@/lib/types/database.types'


function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

interface GoleadorClientProps {
  userId: string
  teams: Team[]
  initial: ScorerPrediction | null
  official: OfficialTopScorer | null
  phase: TournamentPhase
}

export function GoleadorClient({ userId, teams, initial, official, phase }: GoleadorClientProps) {
  const locked = phase !== 'predictions_open'
  const [playerName, setPlayerName] = useState(initial?.player_name ?? '')
  const [teamId, setTeamId] = useState<string>(initial?.team_id ? String(initial.team_id) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const teamsByGroup = GROUP_LETTERS.reduce<Record<string, Team[]>>((acc, g) => {
    acc[g] = teams.filter((t) => t.group_letter === g)
    return acc
  }, {})

  async function handleSave() {
    if (!playerName.trim() || !teamId) {
      toast.warning('Ingresa nombre del jugador y selecciona su equipo.')
      return
    }
    setSaving(true)
    const supabase = createMutationClient()
    const { error } = await supabase.from('scorer_predictions').upsert(
      { user_id: userId, player_name: playerName.trim(), team_id: parseInt(teamId, 10) },
      { onConflict: 'user_id' },
    )
    setSaving(false)
    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  // Check if prediction matches official
  const isCorrect = official && initial
    ? normalize(official.player_name) === normalize(initial.player_name) &&
      official.team_id === initial.team_id
    : null

  return (
    <div className="p-4 max-w-md space-y-4">
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Goleador del torneo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {locked && initial && official && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg p-3 text-sm',
              isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive',
            )}>
              <ResultIcon status={isCorrect ? 'correct' : 'wrong'} />
              <span>
                {isCorrect
                  ? '¡Correcto! Tu predicción coincide con el goleador oficial.'
                  : `Goleador oficial: ${official.player_name} (${teams.find(t => t.id === official.team_id)?.name ?? ''})`
                }
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="player-name">Nombre del jugador</Label>
            <Input
              id="player-name"
              placeholder="Ej: Kylian Mbappé"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setSaved(false) }}
              disabled={locked}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-select">Equipo</Label>
            <Select
              value={teamId}
              onValueChange={(v) => { setTeamId(v); setSaved(false) }}
              disabled={locked}
            >
              <SelectTrigger id="team-select">
                <SelectValue placeholder="Seleccionar equipo..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {GROUP_LETTERS.map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>Grupo {g}</SelectLabel>
                    {teamsByGroup[g].map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>La comparación ignora mayúsculas y acentos: &ldquo;mbappe&rdquo; = &ldquo;Mbappé&rdquo; = &ldquo;MBAPPÉ&rdquo;</span>
          </div>

          {!locked && (
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Guardado
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
