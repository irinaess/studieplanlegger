/**
 * Eksempeldata for det som ikke er ekte ennå: eksamener (steg 8), timer og streak
 * (steg 6–7). Alt annet kommer fra Supabase.
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

/** Denne ukens timer per fag (eksempel). */
export const hoursThisWeek: Record<string, number> = { mat111: 12.5, itok101: 13, info132: 6 }
export const weeklyGoalHours = 40

export const streakDays = 4
export const semesterStart = '2026-08-17'

/** Timer per ukedag (man–søn) og fag denne uken. Summen stemmer med hoursThisWeek. */
export const hoursByDay: Record<string, number>[] = [
  { mat111: 3, itok101: 3, info132: 1 },
  { mat111: 2.5, itok101: 3.5, info132: 2 },
  { mat111: 3, itok101: 2.5 },
  { mat111: 2, itok101: 2, info132: 3 },
  { mat111: 2, itok101: 2 },
  {},
  {},
]

/**
 * Eksempeldataene over bruker egne fag-id-er ('mat111' osv.). Når fagene kommer
 * fra databasen, har de andre id-er. Denne funksjonen kobler eksempeldataene til
 * de ekte fagene via fagkoden, og dropper det som ikke har et matchende fag.
 * Midlertidig: forsvinner når timer og eksamener er ekte (steg 6–8).
 */
export function sampleFor(realSubjects: Subject[]) {
  const idByCode = new Map(realSubjects.map((s) => [s.code, s.id]))
  const realId = (sampleId: string) => idByCode.get(subjects.find((s) => s.id === sampleId)?.code ?? '')
  const remapKeys = (record: Record<string, number>) =>
    Object.fromEntries(Object.entries(record).flatMap(([id, h]) => (realId(id) ? [[realId(id)!, h]] : [])))

  return {
    exams: exams.flatMap((e) => (realId(e.subjectId) ? [{ ...e, subjectId: realId(e.subjectId)! }] : [])),
    hoursThisWeek: remapKeys(hoursThisWeek),
    hoursByDay: hoursByDay.map(remapKeys),
  }
}
