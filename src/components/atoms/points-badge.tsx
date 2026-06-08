import { cn } from '@/lib/utils'

interface PointsBadgeProps {
  points: number
  className?: string
}

export function PointsBadge({ points, className }: PointsBadgeProps) {
  if (points === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded text-xs font-semibold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400',
        className
      )}
    >
      +{points} pts
    </span>
  )
}
