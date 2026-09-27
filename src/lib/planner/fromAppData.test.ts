import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Settings, Subject, Task } from '../../types'
import { toOslo } from '../time'
import { buildPlanInput, weekHoursSoFar } from './fromAppData'

const lecture: CalendarEvent = {
  id: 'e1', subjectId: 'mat', title: 'Forelesning', location: null, kind: 'recurring', weekday: 1, date: null,
  startTime: '10:15', endTime: '12:00', validFrom: null, validUntil: null, countsAsStudy: true, source: 'manual',
}
const settings: Settings = {
  displayName: 'Iris', workMinutes: 50, breakMinutes: 10, lunchMinutes: 30, lunchStart: '11:30', defaultEndTime: '16:00',
  weeklyGoalHours: 40, examModeWeeks: 4, examWeeklyGoalHours: 45, semesterStart: null,
}
const subjects: Subject[] = [{ id: 'mat', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 4, weeklyGoalHours: 15, sortOrder: 1 }]

describe('weekHoursSoFar', () => {
  it('teller ferdige forelesninger denne uken, ikke de som gjenstår', () => {
    // Mandag 28.9 kl. 11:00: forelesningen 10:15–12:00 er ikke ferdig
    expect(weekHoursSoFar([lecture], '2026-09-28', 11 * 60)).toEqual({})
    // Onsdag: mandagens forelesning (1,75 t) er med
    expect(weekHoursSoFar([lecture], '2026-09-30', 8 * 60)).toEqual({ mat: 1.75 })
  })
})

describe('buildPlanInput', () => {
  it('henter hendelser, frister og gjenstående arbeid', () => {
    const oblig: Task = {
      id: 't1', subjectId: 'mat', title: 'Oblig 3', type: 'oblig', estimateMinutes: 360, deadline: '2026-09-29T12:00:00Z', starred: false,
      status: 'todo', moveCount: 0, notes: null, completedAt: null,
      subtasks: [
        { id: 'a', title: '1', done: true, sortOrder: 0 },
        { id: 'b', title: '2', done: false, sortOrder: 1 },
      ],
    }
    const done: Task = { ...oblig, id: 't2', status: 'done' }
    const input = buildPlanInput({
      date: '2026-09-28', start: '08:00', end: '16:00', energy: 'normal', now: toOslo('2026-09-28T08:00:00+02:00'),
      settings, events: [lecture], subjects, tasks: [oblig, done],
    })
    expect(input.busy).toEqual([{ start: 615, end: 720 }])
    expect(input.tasks).toEqual([expect.objectContaining({ id: 't1', remainingMinutes: 180, deadlineDays: 1 })])
    expect(input.weekProgress).toBe(0)
    expect(input.settings.lunchStart).toBe(690)
  })
})
