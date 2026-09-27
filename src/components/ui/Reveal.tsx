import type { ReactNode } from 'react'

/**
 * Innhold som glir inn nedenfra når siden lastes.
 * `delay` (ms) gjør at flere elementer kan komme etter hverandre.
 */
export function Reveal({ delay = 0, className = '', children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`motion-safe:animate-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
