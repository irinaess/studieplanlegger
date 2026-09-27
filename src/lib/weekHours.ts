/**
 * Timer per fag og dag denne uken: forelesninger og seminarer som teller med
 * i ukemålet (og er ferdige), pluss tid logget med fokus-timeren eller innsjekk.
 */
import type { CalendarEvent, TimeLog } from '../types'
import { occurrencesOn, weekDates } from './calendar'
import { isoToOsloParts } from './time'

/** Sju oppslag (mandag–søndag): fag-id → timer. */
export function hoursByDay(events: CalendarEvent[], logs: TimeLog[], date: string, nowMinutes: number): Record<string, number>[] {
  const days = weekDates(date)
  const result: Record<string, number>[] = days.map(() => ({}))
  const add = (i: number, subjectId: string, hours: number) => (result[i][subjectId] = (result[i][subjectId] ?? 0) + hours)

  days.forEach((day, i) => {
    if (day > date) return
    for (const o of occurrencesOn(events, day)) {
      if (!o.event.countsAsStudy || !o.event.subjectId) continue
      if (day === date && o.end > nowMinutes) continue // ikke ferdig ennå
      add(i, o.event.subjectId, (o.end - o.start) / 60)
    }
  })

  for (const log of logs) {
    const i = days.indexOf(isoToOsloParts(log.startedAt).date)
    if (i >= 0) add(i, log.subjectId, log.minutes / 60)
  }
  return result
}

/** Summerer dagene til timer per fag for hele uken. */
export function sumByDay(byDay: Record<string, number>[]): Record<string, number> {
  const total: Record<string, number> = {}
  for (const day of byDay) for (const [id, h] of Object.entries(day)) total[id] = (total[id] ?? 0) + h
  return total
}
