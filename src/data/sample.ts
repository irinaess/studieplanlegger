/**
 * Eksempeldata for det som ikke er ekte ennå: eksamener (steg 8).
 * Alt annet kommer fra Supabase.
 */
import type { Exam, Subject } from '../types'

export const subjects: Subject[] = [
  { id: 'mat111', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 4, weeklyGoalHours: 15 },
  { id: 'itok101', code: 'ITØK101', name: 'Mikroøkonomi', color: '#AC9C8D', weight: 4, weeklyGoalHours: 15 },
  { id: 'info132', code: 'INFO132', name: 'Programmering', color: '#3E4A5C', weight: 2, weeklyGoalHours: 10 },
]

export const exams: Exam[] = [
  { subjectId: 'info132', date: '2026-11-27T09:00:00+01:00', location: 'Egget, Studentsenteret' },
  { subjectId: 'itok101', date: '2026-12-04T09:00:00+01:00' },
  { subjectId: 'mat111', date: '2026-12-10T09:00:00+01:00' },
]

export const semesterStart = '2026-08-17'

/**
 * Eksempeldataene over bruker egne fag-id-er ('mat111' osv.). Når fagene kommer
 * fra databasen, har de andre id-er. Denne funksjonen kobler eksempeldataene til
 * de ekte fagene via fagkoden, og dropper det som ikke har et matchende fag.
 * Midlertidig: forsvinner når eksamener er ekte (steg 8).
 */
export function sampleFor(realSubjects: Subject[]) {
  const idByCode = new Map(realSubjects.map((s) => [s.code, s.id]))
  const realId = (sampleId: string) => idByCode.get(subjects.find((s) => s.id === sampleId)?.code ?? '')

  return {
    exams: exams.flatMap((e) => (realId(e.subjectId) ? [{ ...e, subjectId: realId(e.subjectId)! }] : [])),
  }
}
