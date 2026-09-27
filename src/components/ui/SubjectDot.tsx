import type { Subject } from '../../types'

/** Liten prikk i fagets farge. */
export function SubjectDot({ subject, className = 'size-2' }: { subject: Subject; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: subject.color }} />
}
