import { describe, expect, it } from 'vitest'
import type { Subtask, Task } from '../types'
import { diffSubtasks, formatDuration, moveWarning, sortTasks, subtaskProgress, upcomingDeadlines, urgency } from './tasks'
import { toOslo } from './time'

function task(overrides: Partial<Task>): Task {
  return {
    id: 't',
    subjectId: 's',
    title: 'Oppgave',
    type: 'annet',
    estimateMinutes: 60,
    deadline: null,
    starred: false,
    status: 'todo',
    moveCount: 0,
    notes: null,
    completedAt: null,
    subtasks: [],
    ...overrides,
  }
}

const sub = (id: string, title: string, done = false, sortOrder = 0): Subtask => ({ id, title, done, sortOrder })

describe('sortTasks', () => {
  it('setter nærmeste frist først, så stjerne, så resten alfabetisk', () => {
    const sorted = sortTasks([
      task({ id: 'uten-frist', title: 'B' }),
      task({ id: 'sen', deadline: '2026-10-10T10:00:00Z' }),
      task({ id: 'stjerne-uten-frist', title: 'C', starred: true }),
      task({ id: 'tidlig', deadline: '2026-10-01T10:00:00Z' }),
      task({ id: 'annen-uten-frist', title: 'A' }),
    ])
    expect(sorted.map((t) => t.id)).toEqual(['tidlig', 'sen', 'stjerne-uten-frist', 'annen-uten-frist', 'uten-frist'])
  })

  it('tar bare med uferdige oppgaver med frist på fristlinjen', () => {
    const list = upcomingDeadlines([
      task({ id: 'ferdig', deadline: '2026-10-01T10:00:00Z', status: 'done' }),
      task({ id: 'uten' }),
      task({ id: 'aktiv', deadline: '2026-10-02T10:00:00Z' }),
    ])
    expect(list.map((t) => t.id)).toEqual(['aktiv'])
  })
})

describe('urgency', () => {
  const now = toOslo('2026-09-28T12:00:00+02:00')
  it('deler inn etter antall dager igjen', () => {
    expect(urgency('2026-09-27T23:59:00+02:00', now)).toBe('overdue')
    expect(urgency('2026-09-30T23:59:00+02:00', now)).toBe('near') // 2 dager
    expect(urgency('2026-10-01T09:00:00+02:00', now)).toBe('soon') // 3 dager
    expect(urgency('2026-10-05T09:00:00+02:00', now)).toBe('later') // 7 dager
  })
})

describe('små hjelpere', () => {
  it('teller deloppgaver', () => {
    expect(subtaskProgress([sub('a', 'x', true), sub('b', 'y'), sub('c', 'z', true)])).toEqual({ done: 2, total: 3 })
  })

  it('varsler først etter tre flyttinger', () => {
    expect(moveWarning(2)).toBeNull()
    expect(moveWarning(3)).toBe('Denne oppgaven er flyttet 3 ganger.')
  })

  it('skriver varighet lesbart', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(90)).toBe('1 t 30 min')
    expect(formatDuration(360)).toBe('6 t')
  })
})

describe('diffSubtasks', () => {
  it('finner nye, endrede og fjernede deloppgaver', () => {
    const before = [sub('1', 'Oppgave 1', false, 0), sub('2', 'Oppgave 2', false, 1), sub('3', 'Oppgave 3', false, 2)]
    const after = [
      sub('1', 'Oppgave 1', true, 0), // krysset av
      sub('3', 'Oppgave 3', false, 2), // flyttet opp (ny rekkefølge 1)
      sub('new-a', 'Oppgave 4'), // ny
      sub('new-b', '   '), // tom, ignoreres
    ]
    const diff = diffSubtasks(before, after)
    expect(diff.toInsert.map((s) => [s.title, s.sortOrder])).toEqual([['Oppgave 4', 2]])
    expect(diff.toUpdate.map((s) => [s.id, s.done, s.sortOrder])).toEqual([
      ['1', true, 0],
      ['3', false, 1],
    ])
    expect(diff.toDelete).toEqual(['2'])
  })

  it('sletter en lagret deloppgave som er tømt for tekst', () => {
    expect(diffSubtasks([sub('1', 'x')], [sub('1', '')]).toDelete).toEqual(['1'])
  })
})
