'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatPhase } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhaseBadge } from '@/components/atoms/phase-badge'
import {
  Users,
  BarChart3,
  Trophy,
  Target,
  RefreshCw,
  ArrowRight,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { AppConfig, AuditLog, TournamentPhase } from '@/lib/types/database.types'

interface AdminDashboardContentProps {
  phase: TournamentPhase
  config: AppConfig | null
  totalParticipants: number
  totalWithStandings: number
  usersWithGroups: number
  usersWithBracket: number
  usersWithScorer: number
  lastRecalcAt: string | null
  auditLogs: AuditLog[]
}

const ACTION_LABELS: Record<string, string> = {
  phase_advanced: 'Fase avanzada',
  standings_recalculated: 'Ranking recalculado',
  official_group_result_set: 'Resultado de grupo guardado',
  official_bracket_result_set: 'Resultado de partido guardado',
  official_best_thirds_set: 'Mejores terceros guardados',
  official_top_scorer_set: 'Goleador oficial guardado',
  snapshot_captured: 'Snapshot capturado',
  registration_toggled: 'Registro modificado',
  predictions_visibility_toggled: 'Visibilidad de predicciones modificada',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function actionIcon(action: string): string {
  if (action.includes('phase')) return '⚙️'
  if (action.includes('standings') || action.includes('recalcul')) return '📊'
  if (action.includes('group')) return '🏟️'
  if (action.includes('bracket')) return '🏆'
  if (action.includes('scorer')) return '⚽'
  if (action.includes('snapshot')) return '📸'
  return '📝'
}

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  href?: string
}

function StatCard({ label, value, sub, icon, href }: StatCardProps) {
  const content = (
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  )

  if (href) {
    return (
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <Link href={href} className="block">{content}</Link>
      </Card>
    )
  }

  return <Card>{content}</Card>
}

export function AdminDashboardContent({
  phase,
  config,
  totalParticipants,
  totalWithStandings,
  usersWithGroups,
  usersWithBracket,
  usersWithScorer,
  lastRecalcAt,
  auditLogs,
}: AdminDashboardContentProps) {
  const lastRecalcLabel = lastRecalcAt
    ? formatDistanceToNow(new Date(lastRecalcAt), { addSuffix: true, locale: es })
    : 'Nunca'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Panel de administración</h1>
          </div>
          <p className="text-sm text-muted-foreground">Vista general del torneo</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      {/* Current phase card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Fase actual</p>
              <p className="text-xl font-bold">{formatPhase(phase)}</p>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Registro:{' '}
                  <span className={cn('font-medium', config?.registration_open ? 'text-emerald-400' : 'text-rose-400')}>
                    {config?.registration_open ? 'Abierto' : 'Cerrado'}
                  </span>
                </span>
                <span>
                  Predicciones públicas:{' '}
                  <span className={cn('font-medium', config?.public_predictions_after_close ? 'text-emerald-400' : 'text-slate-400')}>
                    {config?.public_predictions_after_close ? 'Sí' : 'No'}
                  </span>
                </span>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/admin/fase">
                Control de fase <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Participantes"
          value={totalParticipants}
          sub={`${totalWithStandings} con puntos`}
          icon={<Users className="h-5 w-5" />}
          href="/admin/usuarios"
        />
        <StatCard
          label="Grupos completados"
          value={usersWithGroups}
          sub={`de ${totalParticipants}`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label="Bracket completado"
          value={usersWithBracket}
          sub={`de ${totalParticipants}`}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          label="Goleador completado"
          value={usersWithScorer}
          sub={`de ${totalParticipants}`}
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Recalculation status */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Última recalculación del ranking</p>
                <p className="text-xs text-muted-foreground">{lastRecalcLabel}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/recalcular">
                Recalcular ahora <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: '/admin/resultados/grupos', label: 'Resultados de grupos', emoji: '🏟️' },
          { href: '/admin/resultados/bracket', label: 'Resultados del bracket', emoji: '🏆' },
          { href: '/admin/resultados/goleador', label: 'Goleador oficial', emoji: '⚽' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <span className="text-lg">{link.emoji}</span>
            <span className="font-medium leading-tight">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent audit log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada.</p>
          ) : (
            <ul className="space-y-1">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-base leading-none mt-0.5">{actionIcon(log.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{actionLabel(log.action)}</p>
                    {log.table_name && (
                      <p className="text-xs text-muted-foreground truncate">tabla: {log.table_name}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
