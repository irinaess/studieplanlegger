/**
 * Bro mellom appen og algoritmen: gjør om kalender, oppgaver og innstillinger
 * til det planDay() trenger. Holdes ren (ingen database), så den kan testes.
 */
import type { CalendarEvent, Settings, Subject, Task } from '../../types'
import { isoWeekday, occurrencesOn, weekDates } from '../calendar'
import { clockToMinutes, daysUntil } from '../time'
import { remainingMinutes } from './priorities'
import type { Energy, PlanInput } from './types'

/**
 * Timer per fag så langt denne uken, fra hendelser som teller med i ukemålet
 * (forelesninger, seminarer) og som allerede er ferdige.
 * Fra steg 6 kommer tiden fra fokus-timeren i tillegg (`loggedHours`).
 */
export function weekHoursSoFar(events: CalendarEvent[], date: string, nowMinutes: number, loggedHours: Record<string, number> = {}): Record<string, number> {
  const hours: Record<string, number> = { ...loggedHours }
  for (const day of weekDates(date)) {
    if (day > date) break
    for (const o of occurrencesOn(events, day)) {
      if (!o.event.countsAsStudy || !o.event.subjectId) continue
      if (day === date && o.end > nowMinutes) continue // ikke ferdig ennå
      hours[o.event.subjectId] = (hours[o.event.subjectId] ?? 0) + (o.end - o.start) / 60
    }
  }
  return hours
}

export function buildPlanInput(args: {
  date: string // "yyyy-MM-dd"
  start: string // "HH:mm"
  end: string
  energy: Energy
  now: Date
  settings: Settings
  events: CalendarEvent[]
  subjects: Subject[]
  tasks: Task[]
  loggedHours?: Record<string, number>
  correctionFactors?: (task: Task) => number // steg 7
}): PlanInput {
  const { date, now, settings } = args
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const hours = weekHoursSoFar(args.events, date, nowMinutes, args.loggedHours)

  return {
    start: clockToMinutes(args.start),
    end: clockToMinutes(args.end),
    energy: args.energy,
    settings: {
      workMinutes: settings.workMinutes,
      breakMinutes: settings.breakMinutes,
      lunchStart: clockToMinutes(settings.lunchStart),
      lunchMinutes: settings.lunchMinutes,
    },
    busy: occurrencesOn(args.events, date).map((o) => ({ start: o.start, end: o.end })),
    subjects: args.subjects
      .filter((s) => !s.archived)
      .map((s) => ({ id: s.id, code: s.code, weight: s.weight, weeklyGoalHours: s.weeklyGoalHours, hoursThisWeek: hours[s.id] ?? 0, sortOrder: s.sortOrder ?? 0 })),
    tasks: args.tasks
      .filter((t) => t.status !== 'done')
      .map((t) => ({
        id: t.id,
        subjectId: t.subjectId,
        title: t.title,
        type: t.type,
        remainingMinutes: remainingMinutes(t.estimateMinutes, t.subtasks, args.correctionFactors?.(t) ?? 1),
        deadlineDays: t.deadline ? daysUntil(t.deadline, now) : null,
        starred: t.starred,
      })),
    // Hvor mange arbeidsdager som er gått før i dag: mandag = 0, onsdag = 0.4, lørdag/søndag = 1
    weekProgress: Math.min(5, isoWeekday(date) - 1) / 5,
  }
}
