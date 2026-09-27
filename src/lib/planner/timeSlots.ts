/**
 * Steg 1 og 2 i algoritmen: finn ledig tid, legg inn lunsj, og del resten opp i økter.
 */
import type { Interval } from './types'

/** Korteste økt vi gidder å planlegge. Kortere rester blir fri tid. */
export const MIN_SESSION_MINUTES = 25

/** Hvor langt lunsjen kan flyttes fra ønsket tid hvis noe er i veien (minutter). */
const MAX_LUNCH_SHIFT = 90

/**
 * Trekker opptatte perioder fra et tidsrom.
 * Eksempel: 08:00–16:00 minus en forelesning 10:15–12:00 gir 08:00–10:15 og 12:00–16:00.
 */
export function subtractIntervals(range: Interval, busy: Interval[]): Interval[] {
  let free: Interval[] = [range]
  for (const b of [...busy].sort((x, y) => x.start - y.start)) {
    free = free.flatMap((f) => {
      if (b.end <= f.start || b.start >= f.end) return [f] // ingen overlapp
      const parts: Interval[] = []
      if (b.start > f.start) parts.push({ start: f.start, end: b.start })
      if (b.end < f.end) parts.push({ start: b.end, end: f.end })
      return parts
    })
  }
  return free
}

/**
 * Finner plass til lunsj så nær ønsket tid som mulig.
 * For hvert ledig vindu ser vi hvor tidlig eller sent lunsjen kan starte der,
 * og velger stedet som ligger nærmest ønsket tid (maks 90 min unna).
 */
export function placeLunch(free: Interval[], lunchStart: number, lunchMinutes: number): Interval | null {
  if (lunchMinutes <= 0) return null
  let best: Interval | null = null
  for (const w of free) {
    if (w.end - w.start < lunchMinutes) continue
    const start = Math.min(Math.max(lunchStart, w.start), w.end - lunchMinutes)
    if (Math.abs(start - lunchStart) > MAX_LUNCH_SHIFT) continue
    if (!best || Math.abs(start - lunchStart) < Math.abs(best.start - lunchStart)) best = { start, end: start + lunchMinutes }
  }
  return best
}

/**
 * Deler ledige vinduer inn i økter: jobb, pause, jobb, pause …
 * Den siste økten i et vindu kan være kortere, men minst 25 minutter.
 */
export function buildSlots(free: Interval[], workMinutes: number, breakMinutes: number): Interval[] {
  const slots: Interval[] = []
  for (const w of free) {
    let t = w.start
    while (w.end - t >= MIN_SESSION_MINUTES) {
      const length = Math.min(workMinutes, w.end - t)
      slots.push({ start: t, end: t + length })
      t += length + breakMinutes
    }
  }
  return slots
}
