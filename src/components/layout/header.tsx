'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UserContext } from '@/lib/types/app.types'

interface HeaderProps {
  userContext: UserContext
  onMenuClick?: () => void
  className?: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function Header({ userContext, onMenuClick, className }: HeaderProps) {
  const { full_name, standing } = userContext

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4',
        className
      )}
    >
      {/* Left: hamburger */}
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="-ml-2">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menú</span>
      </Button>

      {/* Center: title */}
      <span className="font-semibold text-sm">Quiniela 2026</span>

      {/* Right: position + avatar */}
      <div className="flex items-center gap-2">
        {standing ? (
          <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
            #{standing.position}&nbsp;·&nbsp;{standing.total_points} pts
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Sin puntos
          </span>
        )}
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(full_name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
