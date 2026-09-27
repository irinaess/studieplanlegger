import type { ReactNode } from 'react'

/**
 * Fremdriftsring. `pathLength={1}` gjør at hele sirkelen har "lengde 1",
 * så fremdrift 0.8 betyr at 80 % av streken tegnes. Innholdet (children)
 * legges midt i ringen.
 */
export function ProgressRing({
  value,
  size = 160,
  stroke = 8,
  color = 'var(--color-burgundy)',
  track = 'var(--color-card)',
  delay = 300,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  delay?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = size / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Roteres -90° så ringen starter kl. 12 i stedet for kl. 3 */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          className="motion-safe:animate-draw"
          style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, Math.min(1, value)), animationDelay: `${delay}ms` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
