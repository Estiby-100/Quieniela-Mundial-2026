import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const REGLAS = [
  {
    categoria: 'Fase de grupos',
    items: [
      { label: 'Posición exacta en grupos', puntos: 5 },
      { label: 'Clasifica pero en posición incorrecta', puntos: 3 },
      { label: 'Mejor tercero correcto', puntos: 3 },
    ],
  },
  {
    categoria: 'Fase de eliminación directa',
    items: [
      { label: 'Ronda de 32 — ganador correcto', puntos: 5 },
      { label: 'Octavos de final — ganador correcto', puntos: 8 },
      { label: 'Cuartos de final — ganador correcto', puntos: 12 },
      { label: 'Semifinales — ganador correcto', puntos: 18 },
      { label: 'Finalista correcto', puntos: 25 },
      { label: 'Campeón correcto', puntos: 40 },
    ],
  },
  {
    categoria: 'Goleador',
    items: [
      { label: 'Goleador del torneo correcto', puntos: 20 },
    ],
  },
]

export default function ReglasPage() {
  const total = REGLAS.flatMap((r) => r.items).reduce((s, i) => s + i.puntos, 0)

  return (
    <div className="px-4 py-6 max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Reglas de puntuación</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Puntos que se otorgan por cada predicción correcta. El puntaje máximo posible es{' '}
        <span className="font-semibold text-foreground">{total} pts</span> (si aciertas todo).
      </p>

      <div className="space-y-4">
        {REGLAS.map((bloque) => (
          <Card key={bloque.categoria}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {bloque.categoria}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ul className="divide-y divide-border">
                {bloque.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{item.label}</span>
                    <span className="font-bold text-primary tabular-nums ml-4 shrink-0">
                      {item.puntos} pts
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
