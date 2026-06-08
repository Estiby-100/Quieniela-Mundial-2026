'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatPhase } from '@/lib/utils'
import { createMutationClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PhaseBadge } from '@/components/atoms/phase-badge'
import { Settings, ArrowRight, AlertTriangle, Loader2, ChevronRight } from 'lucide-react'
import type { TournamentPhase, ScoringRule } from '@/lib/types/database.types'

interface FaseClientProps {
  currentPhase: TournamentPhase
  registrationOpen: boolean
  publicPredictions: boolean
  scoringRules: ScoringRule[]
  adminId: string
}

const PHASE_ORDER: TournamentPhase[] = [
  'setup',
  'predictions_open',
  'predictions_closed',
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'final',
  'completed',
]

const PHASE_WARNINGS: Partial<Record<TournamentPhase, string>> = {
  predictions_closed: 'Se bloquearán todas las predicciones de los participantes. Esta acción no es fácilmente reversible.',
  group_stage: 'El torneo comenzará oficialmente. Se capturarán snapshots de todas las predicciones.',
  round_of_32: 'Se iniciará la fase eliminatoria. Los resultados de grupos quedarán fijos.',
  completed: 'El torneo se marcará como finalizado.',
}

const SCORING_LABELS: Record<string, string> = {
  group_position_exact: 'Posición exacta en grupo',
  group_qualified: 'Clasificado correcto',
  best_third_correct: 'Mejor tercero correcto',
  bracket_r32_correct: 'Ronda 32 — ganador correcto',
  bracket_r16_correct: 'Octavos — ganador correcto',
  bracket_qf_correct: 'Cuartos — ganador correcto',
  bracket_sf_correct: 'Semis — ganador correcto',
  bracket_final_correct: 'Final — ganador correcto',
  bracket_champion: 'Campeón correcto',
  top_scorer_correct: 'Goleador correcto',
}

function nextPhase(phase: TournamentPhase): TournamentPhase | null {
  const idx = PHASE_ORDER.indexOf(phase)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]
}

function PhaseStep({ phase, current }: { phase: TournamentPhase; current: TournamentPhase }) {
  const currentIdx = PHASE_ORDER.indexOf(current)
  const thisIdx = PHASE_ORDER.indexOf(phase)
  const isPast = thisIdx < currentIdx
  const isActive = thisIdx === currentIdx
  const isFuture = thisIdx > currentIdx

  return (
    <div className={cn(
      'flex items-center gap-2 py-2 px-3 rounded-lg text-sm',
      isActive && 'bg-primary/10 border border-primary/30 font-semibold text-primary',
      isPast && 'text-muted-foreground',
      isFuture && 'text-muted-foreground/60',
    )}>
      <span className={cn(
        'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0',
        isActive && 'bg-primary text-primary-foreground',
        isPast && 'bg-muted text-muted-foreground',
        isFuture && 'border border-border text-muted-foreground/60',
      )}>
        {isPast ? '✓' : thisIdx + 1}
      </span>
      {formatPhase(phase)}
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </div>
  )
}

export function FaseClient({
  currentPhase,
  registrationOpen,
  publicPredictions,
  scoringRules,
  adminId,
}: FaseClientProps) {
  const router = useRouter()
  const [phase, setPhase] = useState(currentPhase)
  const [regOpen, setRegOpen] = useState(registrationOpen)
  const [pubPreds, setPubPreds] = useState(publicPredictions)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [savingToggles, setSavingToggles] = useState(false)

  const next = nextPhase(phase)
  const warning = next ? PHASE_WARNINGS[next] : null

  async function handleAdvance() {
    if (!next) return
    setAdvancing(true)
    const supabase = createMutationClient()
    const { error } = await supabase
      .from('app_config')
      .update({ tournament_phase: next, updated_by: adminId })
      .eq('id', 1)
    setAdvancing(false)
    setConfirmOpen(false)
    if (error) {
      toast.error(`Error al avanzar la fase: ${error.message}`)
      return
    }
    toast.success(`Fase avanzada a "${formatPhase(next)}"`)
    setPhase(next)
    router.refresh()
  }

  async function handleToggle(field: 'registration_open' | 'public_predictions_after_close', value: boolean) {
    // optimistic update
    if (field === 'registration_open') setRegOpen(value)
    else setPubPreds(value)

    setSavingToggles(true)
    const supabase = createMutationClient()
    const { error } = await supabase
      .from('app_config')
      .update({ [field]: value, updated_by: adminId })
      .eq('id', 1)
    setSavingToggles(false)

    if (error) {
      // rollback
      if (field === 'registration_open') setRegOpen(!value)
      else setPubPreds(!value)
      toast.error(`Error al guardar: ${error.message}`)
    } else {
      toast.success('Configuración guardada')
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Control de fase</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: phase timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cronología del torneo</CardTitle>
            <CardDescription>Progreso actual del torneo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0.5 pb-4">
            {PHASE_ORDER.map((p) => (
              <PhaseStep key={p} phase={p} current={phase} />
            ))}
          </CardContent>
        </Card>

        {/* Right: actions */}
        <div className="space-y-4">
          {/* Advance phase */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Avanzar fase</CardTitle>
              <CardDescription>
                Fase actual: <span className="font-semibold text-foreground">{formatPhase(phase)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {next ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <PhaseBadge phase={phase} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <PhaseBadge phase={next} />
                  </div>
                  {warning && (
                    <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {warning}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Avanzar a &ldquo;{formatPhase(next)}&rdquo;
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  El torneo ha finalizado. No hay más fases disponibles.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 divide-y divide-border">
              <Toggle
                label="Registro abierto"
                description="Permite que nuevos usuarios creen cuenta."
                checked={regOpen}
                onChange={(v) => handleToggle('registration_open', v)}
                disabled={savingToggles}
              />
              <Toggle
                label="Predicciones públicas"
                description="Muestra las predicciones de todos los participantes una vez cerradas."
                checked={pubPreds}
                onChange={(v) => handleToggle('public_predictions_after_close', v)}
                disabled={savingToggles}
              />
            </CardContent>
          </Card>

          {/* Scoring rules */}
          {scoringRules.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Reglas de puntuación</CardTitle>
                <CardDescription>Solo lectura — modificar en BD directamente</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1">
                  {scoringRules.map((rule) => (
                    <li key={rule.rule_key} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{SCORING_LABELS[rule.rule_key] ?? rule.rule_key}</span>
                      <span className="font-semibold tabular-nums">{rule.points} pts</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Avanzar la fase del torneo?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 mt-1">
                <p>
                  Estás a punto de cambiar la fase de{' '}
                  <strong>{formatPhase(phase)}</strong> a{' '}
                  <strong>{next ? formatPhase(next) : ''}</strong>.
                </p>
                {warning && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {warning}
                  </div>
                )}
                <p className="text-muted-foreground">Esta acción quedará registrada en el log de actividad.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={advancing}>
              Cancelar
            </Button>
            <Button onClick={handleAdvance} disabled={advancing}>
              {advancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar avance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
