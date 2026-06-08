'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  ListOrdered,
  Trophy,
  Users,
  Newspaper,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  BarChart3,
  RefreshCw,
  UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserContext } from '@/lib/types/app.types'

interface SidebarProps {
  userContext: UserContext
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
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

const mainNavItems: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/app/quiniela/grupos', label: 'Mi Quiniela', icon: <ListOrdered className="h-4 w-4" /> },
  { href: '/app/ranking', label: 'Ranking', icon: <Trophy className="h-4 w-4" /> },
  { href: '/app/predicciones', label: 'Ver predicciones', icon: <Users className="h-4 w-4" /> },
  { href: '/app/actividad', label: 'Actividad', icon: <Newspaper className="h-4 w-4" /> },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Panel admin', icon: <Shield className="h-4 w-4" /> },
  { href: '/admin/fase', label: 'Control de fase', icon: <Settings className="h-4 w-4" /> },
  { href: '/admin/resultados/grupos', label: 'Resultados', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/admin/recalcular', label: 'Recalcular', icon: <RefreshCw className="h-4 w-4" /> },
  { href: '/admin/usuarios', label: 'Usuarios', icon: <UserCog className="h-4 w-4" /> },
]

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function Sidebar({ userContext, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { full_name, standing, is_admin } = userContext

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo + toggle */}
      <div className={cn('flex h-14 items-center border-b border-border px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <span className="font-bold text-sm text-foreground truncate">Quiniela 2026</span>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="shrink-0">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className="sr-only">{collapsed ? 'Expandir' : 'Colapsar'} barra lateral</span>
        </Button>
      </div>

      {/* User info */}
      <div className={cn('border-b border-border p-3', collapsed ? 'flex justify-center' : '')}>
        {collapsed ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(full_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{full_name ?? 'Participante'}</p>
              {standing ? (
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary mt-0.5">
                  #{standing.position} · {standing.total_points} pts
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Sin puntos aún</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {is_admin && (
          <>
            <div className="py-2">
              <Separator />
              {!collapsed && (
                <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Admin
                </p>
              )}
            </div>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              />
            ))}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="border-t border-border p-2">
        <button
          onClick={handleSignOut}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )
}
