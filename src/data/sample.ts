/**
 * Eksempeldata for den statiske forsiden (steg 1).
 * Fra steg 2 hentes alt fra Supabase i stedet, og denne filen brukes bare i demo.
 */
import { addDays, set } from 'date-fns'
import type { Exam, PlanBlock, Subject, Task } from '../types'

export const subjects: Subject[] = [
  { id: 'mat111', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 0.4, weeklyGoalHours: 15 },
  { id: 'itok101', code: 'ITØK101', name: 'Mikroøkonomi', color: '#AC9C8D', weight: 0.4, weeklyGoalHours: 15 },
  { id: 'info132', code: 'INFO132', name: 'Programmering', color: '#3E4A5C', weight: 0.2, weeklyGoalHours: 10 },
]

/** Frister relativt til i dag, så forsiden alltid ser "levende" ut. */
function inDays(days: number, hour = 23, minute = 59): string {
  return set(addDays(new Date(), days), { hours: hour, minutes: minute, seconds: 0 }).toISOString()
}

export const tasks: Task[] = [
  { id: 't1', subjectId: 'mat111', title: 'Oblig 3', type: 'oblig', estimateMinutes: 360, deadline: inDays(1, 14, 0), starred: true, subtasksDone: 4, subtasksTotal: 7 },
  { id: 't2', subjectId: 'info132', title: 'Lab 5', type: 'oblig', estimateMinutes: 180, deadline: inDays(4), starred: false, subtasksDone: 1, subtasksTotal: 3 },
  { id: 't3', subjectId: 'itok101', title: 'Seminaroppgaver uke 40', type: 'ovinger', estimateMinutes: 150, deadline: inDays(6, 10, 15), starred: false },
  { id: 't5', subjectId: 'mat111', title: 'Øvingssett 6', type: 'ovinger', estimateMinutes: 240, deadline: inDays(8, 12, 0), starred: false },
  { id: 't4', subjectId: 'itok101', title: 'Innlevering 2', type: 'oblig', estimateMinutes: 300, deadline: inDays(11), starred: false, subtasksDone: 0, subtasksTotal: 4 },
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
