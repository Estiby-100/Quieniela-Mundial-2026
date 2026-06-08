'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RecalcularClientProps {
  adminId: string
  totalParticipants: number
  lastRecalcAt: string | null
  recentRecalcs: { recalculation_id: string; recorded_at: string }[]
}

type RunState = 'idle' | 'running' | 'success' | 'error'

export function RecalcularClient({
  totalParticipants,
  lastRecalcAt,
  recentRecalcs,
}: RecalcularClientProps) {
  const router = useRouter()
  const [state, setState] = useState<RunState>('idle')
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  async function handleRecalculate() {
    setState('running')
    setResultMsg(null)
    setElapsed(null)
    const start = Date.now()

    const supabase = createClient()
    const { data, error } = await supabase.rpc('recalculate_standings')

    const ms = Date.now() - start
    setElapsed(ms)

    if (error) {
      setState('error')
      setResultMsg(error.message)
      toast.error(`Error al recalcular: ${error.message}`)
    } else {
      setState('success')
      setResultMsg(typeof data === 'string' ? data : 'Ranking recalculado correctamente.')
      toast.success('Ranking recalculado')
      router.refresh()
    }
  }

  const lastRecalcLabel = lastRecalcAt
    ? formatDistanceToNow(new Date(lastRecalcAt), { addSuffix: true, locale: es })
    : 'Nunca'

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Recalcular ranking</h1>
      </div>

      {/* Main action card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recalculación completa</CardTitle>
          <CardDescription>
            Ejecuta la función <code className="text-xs bg-muted px-1 py-0.5 rounded">recalculate_standings()</code> para
            actualizar puntos y posiciones de todos los participantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          {/* Stats row */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Última vez: <span className="font-medium text-foreground">{lastRecalcLabel}</span>
            </div>
            <div className="text-muted-foreground">
              {totalParticipants} participante{totalParticipants !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Result banner */}
          {state === 'success' && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{resultMsg}</p>
                {elapsed !== null && (
                  <p className="text-xs text-emerald-400/70 mt-0.5">
                    Completado en {(elapsed / 1000).toFixed(2)}s
                  </p>
                )}
              </div>
            </div>
          )}
          {state === 'error' && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{resultMsg}</p>
            </div>
          )}

          <Button
            onClick={handleRecalculate}
            disabled={state === 'running'}
            size="lg"
            className="w-full gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', state === 'running' && 'animate-spin')} />
            {state === 'running' ? 'Recalculando...' : 'Recalcular ahora'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent recalculations log */}
      {recentRecalcs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Historial reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-1">
              {recentRecalcs.map((r) => (
                <li key={r.recalculation_id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm">
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                    {r.recalculation_id.slice(0, 8)}…
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(r.recorded_at), "d MMM HH:mm", { locale: es })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
