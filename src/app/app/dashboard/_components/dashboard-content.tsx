'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PhaseBanner } from './phase-banner'
import { ProgressCards } from './progress-cards'
import { RankingPreview } from './ranking-preview'
import type { TournamentPhase } from '@/lib/types/database.types'
import { ArrowRight } from 'lucide-react'

interface StandingRow {
  user_id: string
  total_points: number
  points_groups: number
  points_thirds: number
  points_bracket: number
  points_scorer: number
}

interface Profile {
  id: string
  full_name: string | null
}

interface DashboardContentProps {
  userId: string
  phase: TournamentPhase
  groupsCompleted: number
  bracketCompleted: number
  goleadorDone: boolean
  topStandings: StandingRow[]
  profiles: Profile[]
  userPosition: number | null
}

function getOverallPct(groupsCompleted: number, bracketCompleted: number, goleadorDone: boolean): number {
  const total = 12 + 32 + 1
  const completed = groupsCompleted + bracketCompleted + (goleadorDone ? 1 : 0)
  return Math.round((completed / total) * 100)
}

export function DashboardContent({
  userId,
  phase,
  groupsCompleted,
  bracketCompleted,
  goleadorDone,
  topStandings,
  profiles,
  userPosition,
}: DashboardContentProps) {
  const overallPct = getOverallPct(groupsCompleted, bracketCompleted, goleadorDone)
  const predictionsOpen = phase === 'predictions_open'
  const showCTA = predictionsOpen && overallPct < 100

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mundial FIFA 2026 · Tu quiniela
        </p>
      </div>

      {/* Phase banner */}
      <PhaseBanner phase={phase} />

      {/* Progress cards */}
      <ProgressCards
        groupsCompleted={groupsCompleted}
        bracketCompleted={bracketCompleted}
        goleadorDone={goleadorDone}
      />

      {/* CTA button */}
      {showCTA && (
        <Button className="w-full sm:w-auto" size="lg" asChild>
          <Link href="/app/quiniela/grupos">
            {overallPct === 0 ? 'Comenzar mi quiniela' : 'Completar mi quiniela'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}

      {/* Ranking preview */}
      <RankingPreview
        topStandings={topStandings}
        profiles={profiles}
        userId={userId}
        userPosition={userPosition}
      />
    </div>
  )
}
