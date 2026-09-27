import { describe, expect, it } from 'vitest'
import { subjectShares } from '../lib/subjects'
import { eventToRow, joinPriority, rowToDayPlan, rowToEvent, rowToTask, taskToRow, rowToSettings, rowToSubject, settingsToRow, type SettingsRow } from './mappers'

const settingsRow: SettingsRow = {
  display_name: 'Iris',
  work_minutes: 50,
  break_minutes: 10,
  lunch_minutes: 30,
  lunch_start: '11:30:00',
  default_end_time: '16:00:00',
  weekly_goal_hours: '40.0',
  exam_mode_weeks: 4,
  exam_weekly_goal_hours: 45,
  semester_start: null,
}

describe('mappers', () => {
  it('gjør databaserader om til appens format', () => {
    const settings = rowToSettings(settingsRow)
    expect(settings.lunchStart).toBe('11:30')
    expect(settings.defaultEndTime).toBe('16:00')
    expect(settings.weeklyGoalHours).toBe(40) // tekst fra numeric blir tall
  })

  it('går frem og tilbake uten å miste noe', () => {
    const back = settingsToRow(rowToSettings(settingsRow))
    expect(back.lunch_start).toBe('11:30')
    expect(back.weekly_goal_hours).toBe(40)
  })

  it('leser fag', () => {
    const s = rowToSubject({ id: 'x', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 4, weekly_goal_hours: '15.0', sort_order: 1, archived: false })
    expect(s.weeklyGoalHours).toBe(15)
  })
})

describe('subjectShares', () => {
  const base = { name: '', color: '#000000', weeklyGoalHours: 10 }
  it('fordeler etter vekt og hopper over arkiverte fag', () => {
    const shares = subjectShares([
      { ...base, id: 'a', code: 'A', weight: 4 },
      { ...base, id: 'b', code: 'B', weight: 4 },
      { ...base, id: 'c', code: 'C', weight: 2 },
      { ...base, id: 'd', code: 'D', weight: 5, archived: true },
    ])
    expect(shares).toEqual({ a: 0.4, b: 0.4, c: 0.2 })
  })
})

describe('hendelser', () => {
  const row = {
    id: 'e1', subject_id: 's1', title: 'Forelesning', location: 'Auditorium 1', kind: 'recurring' as const,
    weekday: 1, date: null, start_time: '08:15:00', end_time: '10:00:00', valid_from: null, valid_until: '2026-11-20',
    counts_as_study: true, source: 'manual' as const,
  }

  it('leser klokkeslett uten sekunder', () => {
    const e = rowToEvent(row)
    expect([e.startTime, e.endTime]).toEqual(['08:15', '10:00'])
  })

  it('fjerner ukedag og periode når en hendelse gjøres om til engangs', () => {
    const e = { ...rowToEvent(row), kind: 'once' as const, date: '2026-10-05' }
    const out = eventToRow(e)
    expect(out).toMatchObject({ kind: 'once', date: '2026-10-05', weekday: null, valid_until: null })
  })

  it('fjerner dato fra faste hendelser, og tomt sted blir null', () => {
    const out = eventToRow({ ...rowToEvent(row), date: '2026-10-05', location: '  ' })
    expect(out).toMatchObject({ kind: 'recurring', weekday: 1, date: null, location: null })
  })
})

describe('oppgaver', () => {
  it('sorterer deloppgaver og runder estimatet', () => {
    const t = rowToTask({
      id: 't1', subject_id: 's1', title: ' Oblig 3 ', type: 'oblig', estimate_minutes: 360, deadline: null, starred: true,
      status: 'todo', move_count: 0, notes: '', completed_at: null,
      subtasks: [
        { id: 'b', title: 'Oppg. 2', done: false, sort_order: 1 },
        { id: 'a', title: 'Oppg. 1', done: true, sort_order: 0 },
      ],
    })
    expect(t.subtasks.map((s) => s.id)).toEqual(['a', 'b'])
    const row = taskToRow({ ...t, estimateMinutes: 89.6 })
    expect(row).toMatchObject({ title: 'Oblig 3', estimate_minutes: 90, notes: null })
  })
})

describe('dagsplan', () => {
  it('skiller forklaring og advarsler, og sorterer øktene', () => {
    const plan = rowToDayPlan({
      id: 'p', date: '2026-09-28', start_time: '08:00:00', end_time: '16:00:00', energy: 'high', stopped_at: null,
      priority_text: joinPriority('MAT111 før lunsj.', ['Oblig 3 trenger mer tid.']),
      plan_sessions: [
        { id: 'b', kind: 'subject', subject_id: 's', task_id: null, start_at: '2026-09-28T08:00:00Z', end_at: '2026-09-28T08:50:00Z', planned_minutes: 50, actual_minutes: null, status: 'planned' },
        { id: 'a', kind: 'task', subject_id: 's', task_id: 't', start_at: '2026-09-28T06:00:00Z', end_at: '2026-09-28T06:50:00Z', planned_minutes: 50, actual_minutes: null, status: 'planned' },
      ],
    })
    expect(plan.priority).toBe('MAT111 før lunsj.')
    expect(plan.warnings).toEqual(['Oblig 3 trenger mer tid.'])
    expect(plan.sessions.map((s) => s.id)).toEqual(['a', 'b'])
    expect(plan.startTime).toBe('08:00')
  })
})
