import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../types'
import { layoutOverlaps, minutesToClock, occurrencesOn, occursOn, shiftDate, snapToQuarter, visibleHours, weekDates } from './calendar'

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'e',
    subjectId: null,
    title: 'Hendelse',
    location: null,
    kind: 'recurring',
    weekday: 1,
    date: null,
    startTime: '10:15',
    endTime: '12:00',
    validFrom: null,
    validUntil: null,
    countsAsStudy: true,
    source: 'manual',
    ...overrides,
  }
}

describe('datoer', () => {
  it('finner uken fra mandag til søndag, også fra en søndag', () => {
    expect(weekDates('2026-09-27')).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'])
    expect(weekDates('2026-09-28')[0]).toBe('2026-09-28')
  })

  it('flytter datoer over månedsskifte og sommertid', () => {
    expect(shiftDate('2026-09-28', 7)).toBe('2026-10-05')
    expect(shiftDate('2026-10-24', 2)).toBe('2026-10-26') // sommertiden slutter 25. oktober
  })
})

describe('occursOn', () => {
  it('gjentar faste hendelser på riktig ukedag', () => {
    const lecture = event({ weekday: 1 }) // mandag
    expect(occursOn(lecture, '2026-09-28')).toBe(true)
    expect(occursOn(lecture, '2026-10-05')).toBe(true)
    expect(occursOn(lecture, '2026-09-29')).toBe(false) // tirsdag
  })

  it('respekterer gyldighetsperioden', () => {
    const lecture = event({ weekday: 1, validFrom: '2026-09-01', validUntil: '2026-11-20' })
    expect(occursOn(lecture, '2026-08-31')).toBe(false)
    expect(occursOn(lecture, '2026-11-16')).toBe(true)
    expect(occursOn(lecture, '2026-11-23')).toBe(false)
  })

  it('viser engangshendelser bare på datoen', () => {
    const once = event({ kind: 'once', weekday: null, date: '2026-10-01' })
    expect(occursOn(once, '2026-10-01')).toBe(true)
    expect(occursOn(once, '2026-10-08')).toBe(false)
  })

  it('sorterer dagens hendelser etter starttid', () => {
    const list = occurrencesOn(
      [event({ id: 'b', startTime: '14:15', endTime: '16:00' }), event({ id: 'a', startTime: '08:15', endTime: '10:00' })],
      '2026-09-28',
    )
    expect(list.map((o) => o.event.id)).toEqual(['a', 'b'])
    expect(list[0].start).toBe(8 * 60 + 15)
  })
})

describe('layoutOverlaps', () => {
  it('gir én kolonne når ingenting overlapper', () => {
    const out = layoutOverlaps([{ start: 480, end: 600 }, { start: 600, end: 700 }])
    expect(out.map((o) => [o.column, o.columns])).toEqual([[0, 1], [0, 1]])
  })

  it('legger overlappende hendelser side om side og gjenbruker ledige kolonner', () => {
    // A 08–10, B 09–11, C 10–11: C kan bruke A sin kolonne når A er ferdig
    const out = layoutOverlaps([
      { id: 'A', start: 480, end: 600 },
      { id: 'B', start: 540, end: 660 },
      { id: 'C', start: 600, end: 660 },
    ])
    expect(out.map((o) => [o.id, o.column, o.columns])).toEqual([
      ['A', 0, 2],
      ['B', 1, 2],
      ['C', 0, 2],
    ])
  })
})

describe('hjelpefunksjoner', () => {
  it('utvider synlige timer ved tidlige og sene hendelser', () => {
    expect(visibleHours([])).toEqual({ from: 8, to: 17 })
    expect(visibleHours(occurrencesOn([event({ startTime: '07:30', endTime: '19:15' })], '2026-09-28'))).toEqual({ from: 7, to: 20 })
  })

  it('runder til kvarter og formaterer klokkeslett', () => {
    expect(snapToQuarter(617)).toBe(615)
    expect(snapToQuarter(623)).toBe(630)
    expect(minutesToClock(615)).toBe('10:15')
    expect(minutesToClock(5)).toBe('00:05')
  })
})
