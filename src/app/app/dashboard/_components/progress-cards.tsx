'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, ListOrdered, Trophy, User } from 'lucide-react'

interface ProgressCardsProps {
  groupsCompleted: number
  bracketCompleted: number
  goleadorDone: boolean
}

interface ProgressCardProps {
  title: string
  completed: number
  total: number | null
  done?: boolean
  icon: React.ReactNode
}

function ProgressCard({ title, completed, total, done, icon }: ProgressCardProps) {
  const pct = total !== null ? Math.round((completed / total) * 100) : done ? 100 : 0
  const isComplete = total !== null ? completed >= total : !!done

  return (
    <Card className={cn('transition-colors', isComplete && 'border-primary/40 bg-primary/5')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>

        {total !== null ? (
          <>
            <Progress value={pct} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completed} de {total}</span>
              <span>{pct}%</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            {done ? 'Completado' : 'Pendiente'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ProgressCards({ groupsCompleted, bracketCompleted, goleadorDone }: ProgressCardsProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Mi progreso
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ProgressCard
          title="Grupos"
          completed={groupsCompleted}
          total={12}
          icon={<ListOrdered className="h-4 w-4" />}
        />
        <ProgressCard
          title="Bracket"
          completed={bracketCompleted}
          total={32}
          icon={<Trophy className="h-4 w-4" />}
        />
        <ProgressCard
          title="Goleador"
          completed={goleadorDone ? 1 : 0}
          total={null}
          done={goleadorDone}
          icon={<User className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
