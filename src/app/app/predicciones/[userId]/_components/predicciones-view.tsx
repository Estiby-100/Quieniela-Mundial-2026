'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GruposClient } from '@/app/app/quiniela/grupos/_components/grupos-client'
import { TercerosClient } from '@/app/app/quiniela/mejores-terceros/_components/terceros-client'
import { BracketClient } from '@/app/app/quiniela/bracket/_components/bracket-client'
import { GoleadorClient } from '@/app/app/quiniela/goleador/_components/goleador-client'
import type {
  Team, GroupPrediction, OfficialGroupResult,
  BracketTemplate, ScorerPrediction, OfficialTopScorer,
} from '@/lib/types/database.types'

interface PrediccionesViewProps {
  userId: string
  // grupos
  teamsByGroup: Record<string, Team[]>
  predsByGroup: Record<string, GroupPrediction>
  officialsByGroup: Record<string, OfficialGroupResult>
  // terceros
  teamsById: Record<number, Team>
  position3Ids: number[]
  selectedThirdIds: number[]
  officialThirdIds: number[]
  groupsCompleted: number
  // bracket
  template: BracketTemplate[]
  bracketPredictions: Record<number, number>
  groupWinners: Record<string, number>
  groupRunnerUps: Record<string, number>
  officialBracketMap: Record<number, number>
  serverSlots: Record<number, { a: number | null; b: number | null }>
  // goleador
  teams: Team[]
  scorerPrediction: ScorerPrediction | null
  officialTopScorer: OfficialTopScorer | null
}

const TABS = [
  { value: 'grupos',   label: 'Grupos' },
  { value: 'terceros', label: '3ros' },
  { value: 'bracket',  label: 'Bracket' },
  { value: 'goleador', label: 'Goleador' },
]

export function PrediccionesView({
  userId,
  teamsByGroup, predsByGroup, officialsByGroup,
  teamsById, position3Ids, selectedThirdIds, officialThirdIds, groupsCompleted,
  template, bracketPredictions, groupWinners, groupRunnerUps, officialBracketMap, serverSlots,
  teams, scorerPrediction, officialTopScorer,
}: PrediccionesViewProps) {
  return (
    <Tabs defaultValue="grupos" className="flex flex-col h-full">
      <TabsList className="mx-4 mt-3 mb-0 flex-wrap h-auto gap-1 shrink-0">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="grupos" className="mt-0">
          <GruposClient
            userId={userId}
            teamsByGroup={teamsByGroup}
            predsByGroup={predsByGroup}
            officialsByGroup={officialsByGroup}
            phase="predictions_closed"
          />
        </TabsContent>

        <TabsContent value="terceros" className="mt-0">
          <TercerosClient
            userId={userId}
            teamsById={teamsById}
            position3Ids={position3Ids}
            initialSelected={selectedThirdIds}
            groupsCompleted={groupsCompleted}
            phase="predictions_closed"
            officialThirdIds={officialThirdIds}
          />
        </TabsContent>

        <TabsContent value="bracket" className="mt-0">
          <BracketClient
            userId={userId}
            template={template}
            teamsById={teamsById}
            initialPredictions={bracketPredictions}
            groupWinners={groupWinners}
            groupRunnerUps={groupRunnerUps}
            officialBracketMap={officialBracketMap}
            serverSlots={serverSlots}
            phase="predictions_closed"
          />
        </TabsContent>

        <TabsContent value="goleador" className="mt-0">
          <GoleadorClient
            userId={userId}
            teams={teams}
            initial={scorerPrediction}
            official={officialTopScorer}
            phase="predictions_closed"
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}
