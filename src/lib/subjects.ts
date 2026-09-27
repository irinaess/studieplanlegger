import type { Subject } from '../types'

/**
 * Hvor stor andel av studietiden hvert fag skal ha, ut fra vektingen.
 * Eksempel: vekt 4, 4 og 2 gir 40 %, 40 % og 20 %.
 * Arkiverte fag teller ikke med.
 */
export function subjectShares(subjects: Subject[]): Record<string, number> {
  const active = subjects.filter((s) => !s.archived)
  const total = active.reduce((sum, s) => sum + s.weight, 0)
  return Object.fromEntries(active.map((s) => [s.id, total > 0 ? s.weight / total : 0]))
}
