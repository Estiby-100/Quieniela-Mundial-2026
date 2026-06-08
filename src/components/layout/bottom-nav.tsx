'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ListOrdered, Trophy, Users, Settings, BookOpen } from 'lucide-react'
import type { UserContext } from '@/lib/types/app.types'

interface BottomNavProps {
  userContext: UserContext
  className?: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/app/dashboard', label: 'Inicio', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/app/quiniela/grupos', label: 'Quiniela', icon: <ListOrdered className="h-5 w-5" /> },
  { href: '/app/ranking', label: 'Ranking', icon: <Trophy className="h-5 w-5" /> },
  { href: '/app/predicciones', label: 'Ver otros', icon: <Users className="h-5 w-5" /> },
  { href: '/app/reglas', label: 'Reglas', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/admin/dashboard', label: 'Admin', icon: <Settings className="h-5 w-5" />, adminOnly: true },
]

export function BottomNav({ userContext, className }: BottomNavProps) {
  const pathname = usePathname()
  const items = navItems.filter((item) => !item.adminOnly || userContext.is_admin)

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur',
        className
      )}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 min-w-0 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.icon}
            <span className="text-[10px] leading-tight truncate max-w-[56px] text-center">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
