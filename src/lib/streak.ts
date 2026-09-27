/**
 * Streak: antall dager på rad der du nådde dagsplanen.
 *
 * En dag er "nådd" når du har gjort minst 80 % av den planlagte tiden
 * (samme grense som for å godkjenne en økt). Dager uten plan, f.eks. helger,
 * er nøytrale: de bryter ikke streaken. I dag bryter heller ikke før dagen er over.
 */
import type { DayPlan } from '../types'
import { shiftDate } from './calendar'

export const DAY_GOAL_SHARE = 0.8

/** Planlagt og gjennomført tid for en dag, i minutter. */
export function dayProgress(plan: DayPlan): { planned: number; done: number } {
  let planned = 0
  let done = 0
  for (const s of plan.sessions) {
    planned += s.plannedMinutes
    if (s.status === 'done' || s.status === 'partial') done += Math.min(s.actualMinutes ?? 0, s.plannedMinutes)
  }
  return { planned, done }
}

export function reachedGoal(plan: DayPlan): boolean {
  const { planned, done } = dayProgress(plan)
  return planned > 0 && done >= planned * DAY_GOAL_SHARE
}

export function currentStreak(plans: DayPlan[], today: string): number {
  let streak = 0
  for (const plan of [...plans].filter((p) => p.date <= today).sort((a, b) => b.date.localeCompare(a.date))) {
    const reached = reachedGoal(plan)
    if (plan.date === today && !reached) continue // dagen er ikke over ennå
    if (!reached) break
    streak++
  }
  return streak
}

export type DayState = 'reached' | 'missed' | 'today' | 'none'

/** De siste `days` dagene, eldst først, til prikkene i statistikken. */
export function recentDays(plans: DayPlan[], today: string, days = 14): { date: string; state: DayState }[] {
  const byDate = new Map(plans.map((p) => [p.date, p]))
  return Array.from({ length: days }, (_, i) => shiftDate(today, i - days + 1)).map((date) => {
    const plan = byDate.get(date)
    if (!plan) return { date, state: 'none' as const }
    if (reachedGoal(plan)) return { date, state: 'reached' as const }
    return { date, state: date === today ? ('today' as const) : ('missed' as const) }
  })
}
