import { describe, expect, it } from 'vitest'
import { clockToMinutes, countdownText, isAfter, isoToOsloParts, osloToIso, toUtcIso, daysUntil, formatLongDate, formatShortDateTime, greetingFor, toOslo, weekNumber } from './time'

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

describe('clockToMinutes', () => {
  it('gjør om klokkeslett til minutter etter midnatt', () => {
    expect(clockToMinutes('00:00')).toBe(0)
    expect(clockToMinutes('10:15')).toBe(615)
    expect(clockToMinutes('16:00')).toBe(960)
  })
})

describe('frister i norsk tid', () => {
  it('regner om til UTC med riktig sommertid og vintertid', () => {
    expect(osloToIso('2026-07-01', '12:00')).toBe('2026-07-01T10:00:00.000Z') // sommertid: +2
    expect(osloToIso('2026-11-01', '12:00')).toBe('2026-11-01T11:00:00.000Z') // vintertid: +1
  })

  it('går frem og tilbake uten å endre dag eller klokkeslett', () => {
    expect(isoToOsloParts(osloToIso('2026-10-02', '23:59'))).toEqual({ date: '2026-10-02', time: '23:59' })
  })
})

describe('sammenligning av tidspunkt', () => {
  // Denne feilen skjedde: en økt kl. 01:05 så ut til å ha startet kl. 00:01,
  // fordi "…28T00:01+02:00" og "…27T23:05+00:00" ble sammenlignet som tekst.
  it('sammenligner norsk tid og UTC riktig', () => {
    const now = toOslo('2026-09-28T00:01:00+02:00')
    expect(isAfter('2026-09-27T23:05:00+00:00', now)).toBe(true) // 01:05 norsk tid er etter 00:01
    expect(isAfter('2026-09-27T22:00:00+00:00', now)).toBe(false)
    expect(toUtcIso(now)).toBe('2026-09-27T22:01:00.000Z')
  })
})
