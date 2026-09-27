/**
 * Oppgavelogikk: sortering, fremdrift, frister og flyttevarsel.
 * Ren TypeScript uten React eller database, så alt kan testes.
 */
import type { Subtask, Task, TaskDraft } from '../types'
import { daysUntil } from './time'

/** Etter så mange flyttinger viser appen en rolig påminnelse. */
export const MOVE_WARNING_THRESHOLD = 3

/** En ny, tom oppgave i et gitt fag. */
export function newTaskDraft(subjectId: string): TaskDraft {
  return {
    subjectId,
    title: '',
    type: 'oblig',
    estimateMinutes: 120,
    deadline: null,
    starred: false,
    status: 'todo',
    moveCount: 0,
    notes: null,
    completedAt: null,
    subtasks: [],
  }
}

/** Hvor mange deloppgaver er ferdige? */
export function subtaskProgress(subtasks: Subtask[]): { done: number; total: number } {
  return { done: subtasks.filter((s) => s.done).length, total: subtasks.length }
}

/**
 * Rekkefølgen i oppgavelisten:
 *  1. oppgaver med frist, nærmeste først
 *  2. ved lik frist (eller ingen frist): stjernemerkede først
 *  3. til slutt alfabetisk, så listen ikke hopper rundt
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    if (a.starred !== b.starred) return a.starred ? -1 : 1
    return a.title.localeCompare(b.title, 'nb')
  })
}

/** Uferdige oppgaver med frist, nærmeste først. Brukes av fristlinjen på forsiden. */
export function upcomingDeadlines(tasks: Task[]): Task[] {
  return sortTasks(tasks.filter((t) => t.deadline && t.status !== 'done'))
}

export type Urgency = 'overdue' | 'near' | 'soon' | 'later'

/** Hvor nær er fristen? near = under 3 dager, soon = under 7 dager. */
export function urgency(deadline: string, now: Date): Urgency {
  const days = daysUntil(deadline, now)
  if (days < 0) return 'overdue'
  if (days < 3) return 'near'
  if (days < 7) return 'soon'
  return 'later'
}

/** Rolig og ærlig påminnelse når en oppgave er flyttet mange ganger. */
export function moveWarning(moveCount: number): string | null {
  return moveCount >= MOVE_WARNING_THRESHOLD ? `Denne oppgaven er flyttet ${moveCount} ganger.` : null
}

/** Minutter som lesbar tekst: 45 → "45 min", 90 → "1 t 30 min", 360 → "6 t". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} t` : `${h} t ${m} min`
}

/**
 * Hva må gjøres i databasen når deloppgavene er redigert?
 * Sammenligner listen før og etter, og deler endringene i tre:
 * nye (lages), endrede (oppdateres) og fjernede (slettes).
 */
export function diffSubtasks(before: Subtask[], after: Subtask[]) {
  const beforeById = new Map(before.map((s) => [s.id, s]))
  const afterIds = new Set(after.map((s) => s.id))
  const withOrder = after.map((s, i) => ({ ...s, title: s.title.trim(), sortOrder: i })).filter((s) => s.title !== '')

  return {
    toInsert: withOrder.filter((s) => s.id.startsWith('new-')),
    toUpdate: withOrder.filter((s) => {
      const old = beforeById.get(s.id)
      return old && (old.title !== s.title || old.done !== s.done || old.sortOrder !== s.sortOrder)
    }),
    toDelete: [
      ...before.filter((s) => !afterIds.has(s.id)).map((s) => s.id),
      // deloppgaver som er tømt for tekst, regnes som fjernet
      ...after.filter((s) => !s.id.startsWith('new-') && s.title.trim() === '').map((s) => s.id),
    ],
  }
}
