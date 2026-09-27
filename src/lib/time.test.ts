import { describe, expect, it } from 'vitest'
import { countdownText, daysUntil, formatLongDate, formatShortDateTime, greetingFor, toOslo, weekNumber } from './time'

describe('greetingFor', () => {
  it('gir riktig hilsen på grensene', () => {
    expect(greetingFor(4)).toBe('God natt')
    expect(greetingFor(5)).toBe('God morgen')
    expect(greetingFor(9)).toBe('God morgen')
    expect(greetingFor(10)).toBe('God formiddag')
    expect(greetingFor(12)).toBe('God ettermiddag')
    expect(greetingFor(17)).toBe('God ettermiddag')
    expect(greetingFor(18)).toBe('God kveld')
    expect(greetingFor(22)).toBe('God kveld')
    expect(greetingFor(23)).toBe('God natt')
    expect(greetingFor(0)).toBe('God natt')
  })
})

describe('dato og uke', () => {
  const sunday = toOslo('2026-09-27T12:00:00+02:00')

  it('skriver norsk dato med stor forbokstav', () => {
    expect(formatLongDate(sunday)).toBe('Søndag 27. september')
  })

  it('bruker ISO-uker (søndag hører til uken som startet mandag)', () => {
    expect(weekNumber(sunday)).toBe(39)
    expect(weekNumber(toOslo('2026-09-28T08:00:00+02:00'))).toBe(40)
  })
})

describe('nedtelling', () => {
  const now = toOslo('2026-09-27T23:30:00+02:00')

  it('teller kalenderdager i norsk tid, ikke 24-timersperioder', () => {
    // 30 minutter til midnatt, men det er likevel "i morgen"
    expect(daysUntil('2026-09-28T00:10:00+02:00', now)).toBe(1)
    expect(daysUntil('2026-10-01T12:00:00+02:00', now)).toBe(4)
  })

  it('lager lesbar tekst', () => {
    expect(countdownText(0)).toBe('i dag')
    expect(countdownText(1)).toBe('i morgen')
    expect(countdownText(4)).toBe('4 dager igjen')
    expect(countdownText(-1)).toBe('gikk ut i går')
  })
})

describe('formatShortDateTime', () => {
  it('viser kort norsk dato og 24-timersklokke', () => {
    expect(formatShortDateTime('2026-10-02T21:59:00Z')).toBe('fre 2. okt. 23:59')
  })
})
