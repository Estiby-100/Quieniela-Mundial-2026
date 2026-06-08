import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import type { AuditLog, Profile } from '@/lib/types/database.types'

const ACTION_LABELS: Record<string, string> = {
  RECALCULATE_STANDINGS: 'Standings recalculados',
  SNAPSHOT_CAPTURED: 'Snapshots capturados',
  UPDATE: 'Registro actualizado',
  INSERT: 'Registro creado',
  DELETE: 'Registro eliminado',
}

const TABLE_LABELS: Record<string, string> = {
  app_config: 'Configuración',
  official_group_results: 'Resultado de grupos',
  official_best_thirds: 'Mejores terceros oficiales',
  official_bracket_results: 'Resultado de bracket',
  official_top_scorer: 'Goleador oficial',
  profiles: 'Perfil',
  standings: 'Standings',
  prediction_snapshots: 'Snapshots de predicciones',
}

export default async function ActividadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = (profileResult.data as Pick<Profile, 'is_admin'> | null)?.is_admin ?? false

  // Admins see all; users see only phase changes + result events
  const query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    query.in('table_name', ['app_config', 'official_group_results', 'official_best_thirds', 'official_bracket_results', 'official_top_scorer'])
  }

  const logsResult = await query
  const logs = (logsResult.data ?? []) as AuditLog[]

  // Fetch actor profiles
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[]
  const actorsResult = actorIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] }
  const actorsById = Object.fromEntries(
    (actorsResult.data as Pick<Profile, 'id' | 'full_name'>[] ?? []).map((p) => [p.id, p]),
  )

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Actividad reciente</h1>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No hay actividad registrada aún.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const actor = log.actor_id ? actorsById[log.actor_id] : null
            const actionLabel = ACTION_LABELS[log.action] ?? log.action
            const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
            const timeAgo = formatDistanceToNow(new Date(log.created_at), {
              addSuffix: true,
              locale: es,
            })
            return (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{actionLabel}</span>
                    {' '}
                    <span className="text-muted-foreground">en {tableLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {actor?.full_name ?? 'Sistema'} · {timeAgo}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
