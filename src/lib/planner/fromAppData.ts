/**
 * Bro mellom appen og algoritmen: gjør om kalender, oppgaver og innstillinger
 * til det planDay() trenger. Holdes ren (ingen database), så den kan testes.
 */
import type { CalendarEvent, Settings, Subject, Task, TimeLog } from '../../types'
import { isoWeekday, occurrencesOn } from '../calendar'
import { clockToMinutes, daysUntil } from '../time'
import { hoursByDay, sumByDay } from '../weekHours'
import { remainingMinutes } from './priorities'
import type { Energy, PlanInput } from './types'

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
  logs?: TimeLog[] // denne ukens tidslogger
  correctionFactors?: (task: Task) => number // steg 7
}): PlanInput {
  const { date, now, settings } = args
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const hours = sumByDay(hoursByDay(args.events, args.logs ?? [], date, nowMinutes))

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
