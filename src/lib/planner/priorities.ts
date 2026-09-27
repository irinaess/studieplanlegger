/**
 * Steg 3 og 4 i algoritmen: hva haster, og hvilke fag trenger mest tid?
 */
import type { TaskType } from '../../types'
import type { PlannerSubject, PlannerTask } from './types'

/** Hvor tungt arbeidet er. Brukes til å legge tungt tidlig (høy energi) eller sent (lav energi). */
export const HEAVINESS: Record<TaskType, number> = { oblig: 3, ovinger: 3, annet: 2, lesing: 1 }

/**
 * Hvor mye det teller å ligge bak ukemålet. Med 3 blir et fag med 20 % vekting
 * (INFO132) valgt omtrent fra onsdag hvis det ikke har fått tid ennå.
 */
export const BEHIND_BOOST = 3

export type Tier = 'must' | 'should' | 'normal'

/**
 * Hvor mye en oppgave haster:
 *  - must:   frist innen 2 dager (eller allerede gått ut) → får så mange økter den trenger
 *  - should: frist innen en uke, eller stjernemerket → får inntil halvparten av fagets økter
 *  - normal: resten
 */
export function taskTier(task: PlannerTask): Tier {
  if (task.deadlineDays !== null && task.deadlineDays <= 2) return 'must'
  if ((task.deadlineDays !== null && task.deadlineDays <= 6) || task.starred) return 'should'
  return 'normal'
}

/**
 * Hvor mye arbeid som gjenstår på en oppgave, i minutter.
 * Estimatet ganges med din personlige korreksjonsfaktor (steg 7), og for obliger
 * trekkes andelen ferdige deloppgaver fra. Tid som allerede er logget, trekkes også fra.
 */
export function remainingMinutes(
  estimateMinutes: number,
  subtasks: { done: boolean }[],
  correctionFactor = 1,
  loggedMinutes = 0,
): number {
  const share = subtasks.length ? subtasks.filter((s) => !s.done).length / subtasks.length : 1
  return Math.max(0, Math.round(estimateMinutes * correctionFactor * share - loggedMinutes))
}

/**
 * Hvor mye hvert fag "fortjener" tid i dag.
 *
 *   poeng = andel etter vekting × (1 + 3 × hvor langt bak ukemålet faget er)
 *         + 10 hvis faget har en oppgave som MÅ gjøres (frist innen 2 dager)
 *         + 0.5 hvis faget har en oppgave som BØR gjøres (frist innen en uke / stjerne)
 *
 * "Bak ukemålet" regnes mot hvor langt uken har kommet: på onsdag morgen
 * forventer vi 40 % av ukemålet (to av fem arbeidsdager er gått).
 */
export function subjectScores(subjects: PlannerSubject[], tasks: PlannerTask[], weekProgress: number): Map<string, number> {
  const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0) || 1
  const scores = new Map<string, number>()
  for (const s of subjects) {
    const share = s.weight / totalWeight
    const tiers = tasks.filter((t) => t.subjectId === s.id && t.remainingMinutes > 0).map(taskTier)
    const score = share * (1 + BEHIND_BOOST * behindShare(s, weekProgress)) + (tiers.includes('must') ? 10 : 0) + (tiers.includes('should') ? 0.5 : 0)
    scores.set(s.id, score)
  }
  return scores
}

/** Hvor langt bak ukemålet et fag er, som andel av ukemålet (0 = i rute). */
export function behindShare(subject: PlannerSubject, weekProgress: number): number {
  if (subject.weeklyGoalHours <= 0) return 0
  const expected = subject.weeklyGoalHours * Math.min(1, Math.max(0, weekProgress))
  return Math.max(0, expected - subject.hoursThisWeek) / subject.weeklyGoalHours
}

/** Gjennomsnittlig tyngde på det som gjenstår i et fag (2 = middels hvis ingen oppgaver). */
export function subjectHeaviness(subjectId: string, tasks: PlannerTask[]): number {
  const own = tasks.filter((t) => t.subjectId === subjectId && t.remainingMinutes > 0)
  if (own.length === 0) return 2
  return own.reduce((sum, t) => sum + HEAVINESS[t.type], 0) / own.length
}
