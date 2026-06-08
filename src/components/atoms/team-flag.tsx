import { cn } from '@/lib/utils'

interface TeamFlagProps {
  fifaCode: string
  name: string
  showName?: boolean
  className?: string
}

function countryToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(0x1f1e0 + char.charCodeAt(0) - 65))
    .join('')
}

export function TeamFlag({ fifaCode, name, showName = true, className }: TeamFlagProps) {
  const flag = countryToFlag(fifaCode)

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="text-base leading-none" role="img" aria-label={name}>
        {flag}
      </span>
      {showName && <span className="text-sm">{name}</span>}
    </span>
  )
}
