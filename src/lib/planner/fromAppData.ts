/**
 * Bro mellom appen og algoritmen: gjør om kalender, oppgaver og innstillinger
 * til det planDay() trenger. Holdes ren (ingen database), så den kan testes.
 */
import type { CalendarEvent, Exam, ExamTopic, Settings, Subject, Task, TimeLog } from '../../types'
import { isoWeekday, occurrencesOn } from '../calendar'
import { examBoost, examMode, isDue, reviewReason, sortByPriority } from '../exam'
import { clockToMinutes, daysUntil } from '../time'
import { hoursByDay, sumByDay } from '../weekHours'
import { remainingMinutes } from './priorities'
import type { Energy, PlanInput, PlannerTask } from './types'

/** Hvor mange temaer per fag som kan få repetisjonsøkter samme dag. */
const MAX_REVIEWS_PER_SUBJECT = 3

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
  exams?: Exam[] // steg 8
  topics?: ExamTopic[]
}): PlanInput {
  const { date, now, settings } = args
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const hours = sumByDay(hoursByDay(args.events, args.logs ?? [], date, nowMinutes))

  // Eksamensmodus: fag med nær eksamen får mer vekt, og temaer som forfaller blir repetisjonsøkter.
  const exams = args.exams ?? []
  const examActive = examMode(exams, settings, date).active
  const examOf = (subjectId: string) => exams.filter((e) => e.subjectId === subjectId && daysUntil(e.date, now) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0]
  const boost = (subjectId: string) => {
    const exam = examOf(subjectId)
    return examActive && exam ? examBoost(daysUntil(exam.date, now)) : 1
  }
  const reviews: PlannerTask[] = examActive
    ? args.subjects.flatMap((s) =>
        sortByPriority((args.topics ?? []).filter((t) => t.subjectId === s.id && isDue(t, date)), date)
          .slice(0, MAX_REVIEWS_PER_SUBJECT)
          .map((t) => ({
            id: t.id,
            kind: 'review' as const,
            reason: reviewReason(t, s.code, examOf(s.id), now),
            subjectId: s.id,
            title: t.title,
            type: 'annet' as const,
            remainingMinutes: settings.workMinutes, // én økt per tema per dag
            deadlineDays: null,
            starred: true, // forfaller i dag → "bør" gjøres
          })),
      )
    : []

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
      .map((s) => ({
        id: s.id,
        code: s.code,
        weight: s.weight * boost(s.id),
        weeklyGoalHours: examActive ? (s.weeklyGoalHours * settings.examWeeklyGoalHours) / settings.weeklyGoalHours : s.weeklyGoalHours,
        hoursThisWeek: hours[s.id] ?? 0,
        sortOrder: s.sortOrder ?? 0,
      })),
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
      }))
      .concat(reviews),
    // Hvor mange arbeidsdager som er gått før i dag: mandag = 0, onsdag = 0.4, lørdag/søndag = 1
    weekProgress: Math.min(5, isoWeekday(date) - 1) / 5,
  }
}
