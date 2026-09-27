import { describe, expect, it } from 'vitest'
import { subjectShares } from '../lib/subjects'
import { rowToSettings, rowToSubject, settingsToRow, type SettingsRow } from './mappers'

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
