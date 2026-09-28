import { describe, expect, it } from 'vitest'
import type { CalendarEvent, DayPlanSession, TimeLog } from '../types'
import { approveSessions } from './approval'
import { checkinChanges, defaultOutcome, type CheckinRow } from './checkin'
import { osloToIso } from './time'
import { hoursByDay, sumByDay } from './weekHours'

const session = (id: string, subjectId: string, start: string, overrides: Partial<DayPlanSession> = {}): DayPlanSession => ({
  id, kind: 'subject', subjectId, taskId: null, topicId: null, startAt: osloToIso('2026-09-28', start), endAt: osloToIso('2026-09-28', start),
  plannedMinutes: 50, actualMinutes: null, status: 'planned', ...overrides,
})
const log = (subjectId: string, minutes: number, sessionId: string | null = null, date = '2026-09-28'): TimeLog => ({
  id: `${subjectId}-${minutes}-${sessionId}`, subjectId, taskId: null, sessionId, startedAt: osloToIso(date, '09:00'), endedAt: osloToIso(date, '10:00'), minutes, source: 'timer',
})

describe('approveSessions', () => {
  it('godkjenner fagøkter når nok tid er logget i faget, uansett hvordan', () => {
    const sessions = [session('a', 'mat', '08:00'), session('b', 'mat', '09:00'), session('c', 'mat', '10:00')]
    // 90 min fri jobbing i MAT111: første økt helt, andre økt 40 av 50 = 80 % → godkjent
    const result = approveSessions(sessions, [log('mat', 90)])
    expect(result.get('a')).toEqual({ status: 'done', actualMinutes: 50 })
    expect(result.get('b')).toEqual({ status: 'done', actualMinutes: 40 })
    expect(result.get('c')).toEqual({ status: 'planned', actualMinutes: 0 })
  })

  it('gir direkte logget tid til riktig økt først, og teller ikke andre fags tid', () => {
    const sessions = [session('a', 'mat', '08:00'), session('b', 'mat', '09:00'), session('i', 'itok', '10:00')]
    const result = approveSessions(sessions, [log('mat', 30, 'b'), log('itok', 20)])
    expect(result.get('a')!.status).toBe('planned')
    expect(result.get('b')).toEqual({ status: 'partial', actualMinutes: 30 })
    expect(result.get('i')).toEqual({ status: 'partial', actualMinutes: 20 })
  })

  it('rører ikke flyttede økter', () => {
    const result = approveSessions([session('a', 'mat', '08:00', { status: 'moved' })], [log('mat', 50)])
    expect(result.has('a')).toBe(false)
  })
})

describe('hoursByDay', () => {
  const lecture: CalendarEvent = {
    id: 'e', subjectId: 'mat', title: 'Forelesning', location: null, kind: 'recurring', weekday: 1, date: null,
    startTime: '10:15', endTime: '12:00', validFrom: null, validUntil: null, countsAsStudy: true, source: 'manual',
  }
  it('legger sammen ferdige forelesninger og logget tid per dag', () => {
    const byDay = hoursByDay([lecture], [log('mat', 90, null, '2026-09-28'), log('itok', 60, null, '2026-09-29')], '2026-09-29', 8 * 60)
    expect(byDay[0]).toEqual({ mat: 1.75 + 1.5 })
    expect(byDay[1]).toEqual({ itok: 1 })
    expect(sumByDay(byDay)).toEqual({ mat: 3.25, itok: 1 })
  })
})

describe('kveldsinnsjekk', () => {
  const row = (overrides: Partial<CheckinRow>): CheckinRow => ({ sessionId: 's', subjectId: 'mat', taskId: null, kind: 'subject', plannedMinutes: 50, outcome: 'helt', minutes: 50, ...overrides })

  it('forhåndsutfyller fra timerens status', () => {
    expect(defaultOutcome(session('a', 'mat', '08:00', { status: 'done', actualMinutes: 48 }))).toEqual({ outcome: 'helt', minutes: 48 })
    expect(defaultOutcome(session('a', 'mat', '08:00'))).toEqual({ outcome: 'ikke', minutes: 0 })
  })

  it('logger bare tiden timeren ikke fikk med, og flytter uferdige oppgaver', () => {
    const changes = checkinChanges(
      [
        row({ sessionId: 'a', minutes: 50 }),
        row({ sessionId: 'b', minutes: 50 }),
        row({ sessionId: 'c', kind: 'task', taskId: 'oblig', outcome: 'delvis', minutes: 20 }),
        row({ sessionId: 'd', kind: 'task', taskId: 'lab', subjectId: 'info', outcome: 'ikke', minutes: 30 }),
        row({ sessionId: 'e', kind: 'task', taskId: 'ferdig', outcome: 'delvis', minutes: 10 }),
      ],
      [log('mat', 60)], // timeren har logget 60 min i MAT111
      new Set(['ferdig']),
    )
    expect(changes.sessionUpdates.find((u) => u.id === 'd')).toEqual({ id: 'd', status: 'skipped', actualMinutes: 0 })
    expect(changes.extraLogs).toEqual([{ subjectId: 'mat', minutes: 50 + 50 + 20 + 10 - 60 }])
    expect(changes.movedTaskIds).toEqual(['oblig', 'lab'])
  })
})
