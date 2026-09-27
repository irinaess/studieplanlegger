/**
 * Kalenderlogikk: hvilke hendelser skjer når, og hvordan de plasseres.
 *
 * Ren TypeScript uten React eller database, så alt kan testes enkelt.
 * Datoer er tekst på formen "yyyy-MM-dd" (f.eks. "2026-09-28"). Det gjør dem
 * lette å sammenligne: "2026-09-28" < "2026-10-01" er sant, akkurat som i tid.
 */
import { addDays, format, getISODay, parseISO, startOfISOWeek } from 'date-fns'
import type { CalendarEvent } from '../types'
import { clockToMinutes } from './time'

/** En konkret forekomst av en hendelse på en bestemt dato. */
export interface Occurrence {
  event: CalendarEvent
  date: string
  start: number // minutter etter midnatt
  end: number
}

/** Date → "yyyy-MM-dd" */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Legger til (eller trekker fra) dager: shiftDate("2026-09-28", 7) → "2026-10-05". */
export function shiftDate(dateKey: string, days: number): string {
  return toDateKey(addDays(parseISO(dateKey), days))
}

/** De sju datoene (mandag–søndag) i uken som inneholder `dateKey`. */
export function weekDates(dateKey: string): string[] {
  const monday = startOfISOWeek(parseISO(dateKey))
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
}

/** Ukedag etter norsk standard: 1 = mandag … 7 = søndag. */
export function isoWeekday(dateKey: string): number {
  return getISODay(parseISO(dateKey))
}

/** Skjer hendelsen på denne datoen? */
export function occursOn(event: CalendarEvent, dateKey: string): boolean {
  if (event.kind === 'once') return event.date === dateKey
  if (event.weekday !== isoWeekday(dateKey)) return false
  if (event.validFrom && dateKey < event.validFrom) return false
  if (event.validUntil && dateKey > event.validUntil) return false
  return true
}

/** Alle hendelser på en dato, sortert etter starttid. */
export function occurrencesOn(events: CalendarEvent[], dateKey: string): Occurrence[] {
  return events
    .filter((e) => occursOn(e, dateKey))
    .map((event) => ({ event, date: dateKey, start: clockToMinutes(event.startTime), end: clockToMinutes(event.endTime) }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
}

/**
 * Plassering av hendelser som overlapper, slik at de står side om side.
 *
 * Hendelser som henger sammen i tid danner en "klynge". Innenfor klyngen får hver
 * hendelse den første kolonnen som er ledig når den starter. Alle i klyngen får
 * samme antall kolonner, så bredden blir lik.
 */
export function layoutOverlaps<T extends { start: number; end: number }>(items: T[]): Array<T & { column: number; columns: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: Array<T & { column: number; columns: number }> = []
  let cluster: Array<T & { column: number; columns: number }> = []
  let columnEnds: number[] = [] // når hver kolonne i klyngen blir ledig
  let clusterEnd = -Infinity

  const closeCluster = () => {
    cluster.forEach((item) => (item.columns = columnEnds.length))
    result.push(...cluster)
    cluster = []
    columnEnds = []
  }

  for (const item of sorted) {
    if (item.start >= clusterEnd) closeCluster() // ingen overlapp med forrige klynge
    let column = columnEnds.findIndex((end) => end <= item.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(item.end)
    } else {
      columnEnds[column] = item.end
    }
    cluster.push({ ...item, column, columns: 1 })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  closeCluster()
  return result
}

/**
 * Hvilke timer kalenderen skal vise. Standard er 08–17, men den utvides
 * hvis noe starter tidligere eller slutter senere.
 */
export function visibleHours(occurrences: Occurrence[], defaultFrom = 8, defaultTo = 17): { from: number; to: number } {
  const from = Math.min(defaultFrom, ...occurrences.map((o) => Math.floor(o.start / 60)))
  const to = Math.max(defaultTo, ...occurrences.map((o) => Math.ceil(o.end / 60)))
  return { from, to }
}

/** Runder av til nærmeste kvarter (i minutter): 617 → 615. */
export function snapToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

/** Minutter etter midnatt → "HH:mm": 615 → "10:15". */
export function minutesToClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}
