'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, Info, Target, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createMutationClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Team, OfficialTopScorer } from '@/lib/types/database.types'

function countryToFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join('')
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

interface ScorerStats {
  correct: number
  wrong: number
  total: number
  topPredictions: { name: string; team: string; count: number }[]
}

interface GoleadorAdminClientProps {
  adminId: string
  teams: Team[]
  initial: OfficialTopScorer | null
}

export function GoleadorAdminClient({ adminId, teams, initial }: GoleadorAdminClientProps) {
  const [playerName, setPlayerName] = useState(initial?.player_name ?? '')
  const [teamId, setTeamId] = useState<string>(initial?.team_id ? String(initial.team_id) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<ScorerStats | null>(null)

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
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
    setSaved(false)
    setStats(null)

    const supabase = createMutationClient()
    const tid = parseInt(teamId, 10)

    const { error } = await supabase
      .from('official_top_scorer')
      .upsert(
        { id: 1, player_name: playerName.trim(), team_id: tid, recorded_by: adminId },
        { onConflict: 'id' },
      )

    if (error) {
      toast.error(`Error: ${error.message}`)
      setSaving(false)
      return
    }

    // Fetch all scorer predictions to compute stats
    const { data: preds } = await supabase
      .from('scorer_predictions')
      .select('player_name, player_normalized, team_id')

    const predRows = (preds ?? []) as { player_name: string; player_normalized: string; team_id: number }[]
    const officialNorm = normalize(playerName.trim())

    let correct = 0
    let wrong = 0

    const countMap = new Map<string, { name: string; team: string; count: number }>()
    for (const p of predRows) {
      const key = `${p.player_normalized}::${p.team_id}`
      if (!countMap.has(key)) {
        countMap.set(key, {
          name: p.player_name,
          team: teamsById[p.team_id]?.name ?? '',
          count: 0,
        })
      }
      countMap.get(key)!.count++

      const match = normalize(p.player_name) === officialNorm && p.team_id === tid
      if (match) correct++
      else wrong++
    }

    const topPredictions = Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setStats({ correct, wrong, total: predRows.length, topPredictions })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    toast.success('Goleador oficial guardado')
  }

  return (
    <div className="px-4 py-6 space-y-4 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Goleador oficial</h1>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Goleador del torneo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="player-name">Nombre del jugador</Label>
            <Input
              id="player-name"
              placeholder="Ej: Kylian Mbappé"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setSaved(false); setStats(null) }}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-select">Equipo</Label>
            <Select
              value={teamId}
              onValueChange={(v) => { setTeamId(v); setSaved(false); setStats(null) }}
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
                        {countryToFlag(team.fifa_code)} {team.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>La comparación ignora mayúsculas y acentos.</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar goleador'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <Check className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats panel */}
      {stats !== null && (
        <Card className={cn(
          'border transition-all',
          stats.correct > 0 ? 'border-emerald-500/30' : 'border-border',
        )}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Resultado entre participantes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Hit / miss counts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.correct}</p>
                <p className="text-xs text-muted-foreground mt-0.5">acertaron</p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{stats.wrong}</p>
                <p className="text-xs text-muted-foreground mt-0.5">fallaron</p>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground tabular-nums">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">total</p>
              </div>
            </div>

            {/* Top predictions */}
            {stats.topPredictions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Predicciones más populares
                </p>
                <ul className="space-y-1">
                  {stats.topPredictions.map((p, i) => (
                    <li
                      key={i}
                      className={cn(
                        'flex items-center gap-2 py-1.5 px-2 rounded-md text-sm',
                        normalize(p.name) === normalize(playerName) && parseInt(teamId, 10) === teams.find(t => t.name === p.team)?.id
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'text-muted-foreground',
                      )}
                    >
                      <span className="w-4 text-xs font-mono text-center">{i + 1}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs truncate max-w-[80px]">{p.team}</span>
                      <span className="text-xs font-semibold tabular-nums ml-auto">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
