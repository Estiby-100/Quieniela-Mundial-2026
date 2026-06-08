'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface QuinielaTabsProps {
  gruposCompleted: number
  tercerosCompleted: number
  bracketCompleted: number
  goleadorDone: boolean
}

const tabs = [
  { label: 'Grupos', href: '/app/quiniela/grupos', max: 12 },
  { label: '3ros', href: '/app/quiniela/mejores-terceros', max: 8 },
  { label: 'Bracket', href: '/app/quiniela/bracket', max: 32 },
  { label: 'Goleador', href: '/app/quiniela/goleador', max: null },
]

export function QuinielaTabs({ gruposCompleted, tercerosCompleted, bracketCompleted, goleadorDone }: QuinielaTabsProps) {
  const pathname = usePathname()

  const counts = [
    gruposCompleted === 12 ? '✓' : `${gruposCompleted}/12`,
    tercerosCompleted === 8 ? '✓' : `${tercerosCompleted}/8`,
    bracketCompleted === 32 ? '✓' : `${bracketCompleted}/32`,
    goleadorDone ? '✓' : '—',
  ]

  return (
    <nav className="flex gap-1 -mb-px" aria-label="Secciones de quiniela">
      {tabs.map((tab, i) => {
        const isActive = pathname.startsWith(tab.href)
        const isDone = counts[i] === '✓'
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-mono',
                isDone
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isActive
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[i]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
