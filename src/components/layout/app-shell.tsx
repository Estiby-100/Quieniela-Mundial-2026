'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import type { UserContext } from '@/lib/types/app.types'

interface AppShellProps {
  userContext: UserContext
  children: React.ReactNode
}

export function AppShell({ userContext, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-svh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border transition-all duration-200 shrink-0',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <Sidebar
          userContext={userContext}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <Header
          userContext={userContext}
          onMenuClick={() => {}}
          className="md:hidden"
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav userContext={userContext} className="md:hidden" />
    </div>
  )
}
