/**
 * Statistikk som brukes flere steder (forsiden, statistikksiden, planleggeren).
 * Krokene henter data med TanStack Query og regner ut med de rene funksjonene i lib/.
 */
import { useMemo } from 'react'
import { useDayPlansRange, useEstimateData, useEvents, useExams, useSettings, useSubjects, useTasks, useTimeLogs } from '../data/api'
import { shiftDate, weekDates } from '../lib/calendar'
import { actualMinutesByTask, correctionFor, corrections, estimateSamples } from '../lib/estimates'
import { effectiveWeeklyGoal } from '../lib/exam'
import { currentStreak, recentDays } from '../lib/streak'
import { osloNow } from '../lib/time'
import { hoursByDay, sumByDay } from '../lib/weekHours'
import { buildWeeklyReport } from '../lib/weeklyReport'
import type { Task } from '../types'

/** Korreksjonsfaktorer for estimater, og faktisk tid per oppgave. */
export function useCorrections() {
  const tasks = useTasks()
  const data = useEstimateData()
  return useMemo(() => {
    const actualByTask = actualMinutesByTask(data.data?.logs ?? [], data.data?.sessions ?? [])
    const list = corrections(estimateSamples(tasks.data ?? [], actualByTask))
    return { list, actualByTask, factorFor: (task: Task) => correctionFor(list, task) }
  }, [tasks.data, data.data])
}

/** Streak og de siste 14 dagene. Ser 90 dager tilbake. */
export function useStreak(today: string) {
  const plans = useDayPlansRange(shiftDate(today, -90), today)
  return useMemo(() => {
    const list = plans.data ?? []
    return { streak: currentStreak(list, today), days: recentDays(list, today), loaded: Boolean(plans.data) }
  }, [plans.data, today])
}

/** Alt ukesrapporten og ukemålet trenger for uken som starter på `weekStart` (en mandag). */
export function useWeekStats(weekStart: string, today: string) {
  const dates = weekDates(weekStart)
  const subjects = useSubjects()
  const settings = useSettings()
  const tasks = useTasks()
  const events = useEvents()
  const logs = useTimeLogs(weekStart)
  const plans = useDayPlansRange(dates[0], dates[6])
  const { actualByTask } = useCorrections()
  const { streak } = useStreak(today)
  const exams = useExams()

  return useMemo(() => {
    if (!subjects.data || !settings.data || !tasks.data || !events.data || !logs.data || !plans.data || !exams.data) return null
    const dates = weekDates(weekStart)
    // Uke som er over: hele uka. Denne uken: frem til nå. Fremtidig uke: ingen timer ennå.
    const lastDay = today < dates[6] ? today : dates[6]
    const now = osloNow()
    const nowMinutes = lastDay === today ? now.getHours() * 60 + now.getMinutes() : 24 * 60
    const byDay = lastDay < dates[0] ? dates.map(() => ({})) : hoursByDay(events.data, logs.data, lastDay, nowMinutes)
    const activeSubjects = subjects.data.filter((s) => !s.archived)
    const report = buildWeeklyReport({
      weekDates: dates,
      subjects: activeSubjects,
      hoursBySubject: sumByDay(byDay),
      goal: effectiveWeeklyGoal(settings.data, exams.data, dates[0] > today ? dates[0] : today < dates[6] ? today : dates[6]),
      tasks: tasks.data,
      plans: plans.data,
      actualByTask,
      streak,
    })
    return { report, byDay, subjects: activeSubjects, settings: settings.data, goal: report.goal }
  }, [weekStart, today, subjects.data, settings.data, tasks.data, events.data, logs.data, plans.data, exams.data, actualByTask, streak])
}
