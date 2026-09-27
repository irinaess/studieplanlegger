/**
 * Eksempeldata for det som ikke er ekte ennå: eksamener (steg 8), dagsplan (steg 5)
 * og timer (steg 6–7). Fag, innstillinger, hendelser og oppgaver kommer fra Supabase.
 */
import type { Exam, PlanBlock, Subject } from '../types'

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

/** Eksempel på en dagsplan. Lages av planleggingsalgoritmen i steg 5. */
export const dayPlan: PlanBlock[] = [
  { start: '08:15', end: '10:00', kind: 'event', subjectId: 'mat111', title: 'Forelesning', status: 'done' },
  { start: '10:15', end: '11:05', kind: 'task', subjectId: 'mat111', title: 'Oblig 3 · oppgave 5', status: 'done' },
  { start: '11:05', end: '11:15', kind: 'pause', title: 'Pause' },
  { start: '11:15', end: '12:05', kind: 'task', subjectId: 'mat111', title: 'Oblig 3 · oppgave 6', status: 'done' },
  { start: '12:05', end: '12:35', kind: 'lunch', title: 'Lunsj' },
  { start: '12:35', end: '13:25', kind: 'subject', subjectId: 'itok101', title: 'Fagøkt', status: 'done' },
  { start: '13:25', end: '13:35', kind: 'pause', title: 'Pause' },
  { start: '13:35', end: '14:25', kind: 'subject', subjectId: 'itok101', title: 'Fagøkt', status: 'active' },
  { start: '14:25', end: '14:35', kind: 'pause', title: 'Pause' },
  { start: '14:35', end: '15:25', kind: 'task', subjectId: 'info132', title: 'Lab 5 · del 2', status: 'planned' },
  { start: '15:25', end: '15:35', kind: 'pause', title: 'Pause' },
  { start: '15:35', end: '16:00', kind: 'subject', subjectId: 'itok101', title: 'Lesing kap. 4', status: 'planned' },
]

/** Kort forklaring på hvorfor dagen ser ut som den gjør (lages av algoritmen i steg 5). */
export const dayPriority =
  'MAT111 har frist i morgen, så dagen startet med Oblig 3 mens energien var høy. ITØK101 får ettermiddagen, fordi faget ligger litt bak ukemålet.'

/**
 * Eksempeldataene over bruker egne fag-id-er ('mat111' osv.). Når fagene kommer
 * fra databasen, har de andre id-er. Denne funksjonen kobler eksempeldataene til
 * de ekte fagene via fagkoden, og dropper det som ikke har et matchende fag.
 * Midlertidig: forsvinner når oppgaver, kalender og planer er ekte (steg 3–5).
 */
export function sampleFor(realSubjects: Subject[]) {
  const idByCode = new Map(realSubjects.map((s) => [s.code, s.id]))
  const realId = (sampleId: string) => idByCode.get(subjects.find((s) => s.id === sampleId)?.code ?? '')
  const remapKeys = (record: Record<string, number>) =>
    Object.fromEntries(Object.entries(record).flatMap(([id, h]) => (realId(id) ? [[realId(id)!, h]] : [])))

  return {
    exams: exams.flatMap((e) => (realId(e.subjectId) ? [{ ...e, subjectId: realId(e.subjectId)! }] : [])),
    dayPlan: dayPlan.flatMap((b) => (!b.subjectId ? [b] : realId(b.subjectId) ? [{ ...b, subjectId: realId(b.subjectId)! }] : [])),
    hoursThisWeek: remapKeys(hoursThisWeek),
    hoursByDay: hoursByDay.map(remapKeys),
  }
}
