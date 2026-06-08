import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Lock, ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import type { Standing, Profile, AppConfig } from '@/lib/types/database.types'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default async function PrediccionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const configResult = await supabase
    .from('app_config')
    .select('tournament_phase, public_predictions_after_close')
    .eq('id', 1)
    .single()

  const config = configResult.data as Pick<AppConfig, 'tournament_phase' | 'public_predictions_after_close'> | null
  const phase = config?.tournament_phase ?? 'setup'
  const isOpen = phase === 'predictions_open'
  const isVisible = !isOpen && (config?.public_predictions_after_close ?? false)

  if (!isVisible) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Predicciones</h1>
        <Card className="p-6 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium mb-1">
            {isOpen
              ? 'Las predicciones están ocultas mientras el período está abierto.'
              : 'Las predicciones de otros participantes no están disponibles.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isOpen
              ? 'Se mostrarán cuando el administrador cierre las predicciones.'
              : 'El administrador ha configurado las predicciones como privadas.'}
          </p>
        </Card>
      </div>
    )
  }

  const standingsResult = await supabase
    .from('standings')
    .select('user_id, total_points')
    .order('total_points', { ascending: false })

  const standings = (standingsResult.data ?? []) as Pick<Standing, 'user_id' | 'total_points'>[]

  const profilesResult = standings.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', standings.map((s) => s.user_id))
    : { data: [] }

  const profilesById = Object.fromEntries(
    (profilesResult.data as Pick<Profile, 'id' | 'full_name'>[] ?? []).map((p) => [p.id, p]),
  )

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Predicciones</h1>
      <div className="space-y-2">
        {standings.map((s, i) => {
          const profile = profilesById[s.user_id]
          const isMe = s.user_id === user.id
          return (
            <Link
              key={s.user_id}
              href={`/app/predicciones/${s.user_id}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors group"
            >
              <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                {i + 1}
              </span>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted">
                  {getInitials(profile?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name ?? 'Sin nombre'}
                  {isMe && <span className="ml-1 text-xs text-muted-foreground">(tú)</span>}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-muted-foreground">
                {s.total_points} pts
              </span>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
