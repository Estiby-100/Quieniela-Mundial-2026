'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { UserCog, Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createMutationClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, Standing } from '@/lib/types/database.types'
import Link from 'next/link'

interface UsuariosClientProps {
  currentUserId: string
  profiles: Profile[]
  standingsById: Record<string, Pick<Standing, 'user_id' | 'total_points' | 'points_groups' | 'points_thirds' | 'points_bracket' | 'points_scorer' | 'last_recalculated_at'>>
  groupCountByUser: Record<string, number>
  bracketUserIds: string[]
  scorerUserIds: string[]
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function ProgressPips({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            i < filled ? 'bg-primary' : 'bg-muted',
          )}
        />
      ))}
    </div>
  )
}

export function UsuariosClient({
  currentUserId,
  profiles,
  standingsById,
  groupCountByUser,
  bracketUserIds,
  scorerUserIds,
}: UsuariosClientProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)

  const bracketSet = new Set(bracketUserIds)
  const scorerSet = new Set(scorerUserIds)

  // Sort: admins first, then by total_points desc, then name
  const sorted = [...profiles].sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1
    const pa = standingsById[a.id]?.total_points ?? 0
    const pb = standingsById[b.id]?.total_points ?? 0
    if (pb !== pa) return pb - pa
    return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'es')
  })

  const ranked = sorted
    .filter((p) => !p.is_admin)
    .map((p, i) => ({ id: p.id, position: i + 1 }))
  const positionById = Object.fromEntries(ranked.map((r) => [r.id, r.position]))

  async function handleToggleAdmin(profileId: string, current: boolean) {
    if (profileId === currentUserId) {
      toast.warning('No puedes modificar tu propio rol de administrador.')
      return
    }
    setTogglingAdmin(profileId)
    const supabase = createMutationClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !current })
      .eq('id', profileId)
    setTogglingAdmin(null)
    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success(!current ? 'Admin activado' : 'Admin desactivado')
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Usuarios</h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {profiles.length} registrado{profiles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {sorted.map((profile) => {
          const standing = standingsById[profile.id]
          const groups = groupCountByUser[profile.id] ?? 0
          const hasBracket = bracketSet.has(profile.id)
          const hasScorer = scorerSet.has(profile.id)
          const position = positionById[profile.id] ?? null
          const isOpen = expanded === profile.id
          const isSelf = profile.id === currentUserId

          const totalCompleted = groups + (hasBracket ? 1 : 0) + (hasScorer ? 1 : 0)

          return (
            <Card
              key={profile.id}
              className={cn(
                'transition-colors',
                profile.is_admin && 'border-primary/30',
                isSelf && 'ring-1 ring-primary/20',
              )}
            >
              {/* Row */}
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn(
                      'text-xs font-semibold',
                      profile.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}>
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {profile.full_name ?? 'Sin nombre'}
                      </span>
                      {profile.is_admin && (
                        <Shield className="h-3 w-3 text-primary shrink-0" aria-label="Admin" />
                      )}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">(tú)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {position && (
                        <span className="text-xs text-muted-foreground">#{position}</span>
                      )}
                      <span className="text-xs font-semibold tabular-nums">
                        {standing?.total_points ?? 0} pts
                      </span>
                      <ProgressPips filled={totalCompleted} total={14} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      asChild
                    >
                      <Link href={`/app/predicciones/${profile.id}`} aria-label="Ver predicciones">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExpanded(isOpen ? null : profile.id)}
                      aria-label={isOpen ? 'Colapsar' : 'Expandir'}
                    >
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    {/* Points breakdown */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Grupos', value: standing?.points_groups ?? 0 },
                        { label: 'Terceros', value: standing?.points_thirds ?? 0 },
                        { label: 'Bracket', value: standing?.points_bracket ?? 0 },
                        { label: 'Goleador', value: standing?.points_scorer ?? 0 },
                      ].map((item) => (
                        <div key={item.label} className="rounded-md bg-muted/40 p-2">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-bold tabular-nums mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Completion */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Grupos: <span className={cn('font-medium', groups === 12 ? 'text-emerald-400' : 'text-foreground')}>{groups}/12</span>
                      </span>
                      <span>
                        Bracket: <span className={cn('font-medium', hasBracket ? 'text-emerald-400' : 'text-foreground')}>{hasBracket ? '✓' : '—'}</span>
                      </span>
                      <span>
                        Goleador: <span className={cn('font-medium', hasScorer ? 'text-emerald-400' : 'text-foreground')}>{hasScorer ? '✓' : '—'}</span>
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Registrado: {format(new Date(profile.created_at), "d MMM yyyy", { locale: es })}
                      </span>
                      {standing?.last_recalculated_at && (
                        <span>
                          Último recálculo: {format(new Date(standing.last_recalculated_at), "d MMM HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>

                    {/* Admin toggle */}
                    {!isSelf && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          Rol: <span className="font-medium text-foreground">{profile.is_admin ? 'Admin' : 'Participante'}</span>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={togglingAdmin === profile.id}
                          onClick={() => handleToggleAdmin(profile.id, profile.is_admin)}
                        >
                          {togglingAdmin === profile.id
                            ? 'Guardando...'
                            : profile.is_admin ? 'Quitar admin' : 'Hacer admin'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
