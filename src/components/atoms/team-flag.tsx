import { cn } from '@/lib/utils'

interface TeamFlagProps {
  fifaCode?: string
  name: string
  showName?: boolean
  className?: string
}

export function TeamFlag({ name, showName = true, className }: TeamFlagProps) {
  if (!showName) return null
  return <span className={cn('text-sm', className)}>{name}</span>
}
