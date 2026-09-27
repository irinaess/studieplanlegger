import { describe, expect, it } from 'vitest'
import type { CalendarEvent, DayPlan, Settings } from '../types'
import { planBlocks } from './dayPlanView'
import { osloToIso } from './time'

const settings = { lunchStart: '11:30', lunchMinutes: 30 } as Settings
const lecture: CalendarEvent = {
  id: 'e', subjectId: 'mat', title: 'Forelesning', location: null, kind: 'recurring', weekday: 1, date: null,
  startTime: '08:15', endTime: '10:00', validFrom: null, validUntil: null, countsAsStudy: true, source: 'manual',
}
const session = (id: string, start: string, end: string, status: DayPlan['sessions'][number]['status'] = 'planned') => ({
  id, kind: 'subject' as const, subjectId: 'mat', taskId: null, startAt: osloToIso('2026-09-28', start), endAt: osloToIso('2026-09-28', end),
  plannedMinutes: 50, actualMinutes: null, status,
})
const plan: DayPlan = {
  id: 'p', date: '2026-09-28', startTime: '08:00', endTime: '16:00', energy: 'normal', priority: '', warnings: [], stoppedAt: null,
  sessions: [session('a', '10:15', '11:05'), session('b', '12:00', '12:50'), session('c', '13:00', '13:50', 'moved')],
}

describe('planBlocks', () => {
  it('slår sammen hendelser, lunsj og økter i riktig rekkefølge og med riktig status', () => {
    const blocks = planBlocks({ plan, events: [lecture], tasks: [], settings, nowMinutes: 12 * 60 + 10 })
    expect(blocks.map((b) => [b.start, b.kind, b.status])).toEqual([
      ['08:15', 'event', 'past'],
      ['10:15', 'subject', 'past'],
      ['11:30', 'lunch', undefined],
      ['12:00', 'subject', 'active'],
      ['13:00', 'subject', 'moved'],
    ])
  })
})
