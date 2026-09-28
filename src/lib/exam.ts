/**
 * Eksamensmodus: når den gjelder, hvilke temaer som bør repeteres, spaced
 * repetition, og en ærlig realismesjekk. Ren TypeScript, så alt kan testes.
 */
import type { Exam, ExamTopic, Importance, Settings } from '../types'
import { shiftDate } from './calendar'
import { formatHours } from './format'
import { daysUntil, isoToOsloParts } from './time'

export const IMPORTANCE_WEIGHT: Record<Importance, number> = { low: 1, medium: 2, high: 3 }
export const IMPORTANCE_LABEL: Record<Importance, string> = { low: 'lav', medium: 'middels', high: 'høy' }

// ---------- Eksamensmodus ----------

/** Når starter eksamensmodus, og gjelder den i dag? Gjelder fra X uker før første eksamen til siste eksamen. */
export function examMode(exams: Exam[], settings: Pick<Settings, 'examModeWeeks'>, today: string) {
  const dates = exams.map((e) => isoToOsloParts(e.date).date).sort()
  if (dates.length === 0 || settings.examModeWeeks <= 0) return { active: false, startsOn: null as string | null }
  const startsOn = shiftDate(dates[0], -settings.examModeWeeks * 7)
  return { active: today >= startsOn && today <= dates.at(-1)!, startsOn }
}

/** Ukemålet som gjelder: høyere i eksamensmodus. */
export function effectiveWeeklyGoal(settings: Settings, exams: Exam[], today: string): number {
  return examMode(exams, settings, today).active ? settings.examWeeklyGoalHours : settings.weeklyGoalHours
}

/**
 * Hvor mye ekstra vekt et fag får fordi eksamen nærmer seg.
 * 5 dager igjen → ×2,2, 30 dager → ×1,4, 60 dager → ×1,2. Fag med eksamen
 * langt unna får fortsatt tid, bare mindre.
 */
export function examBoost(daysLeft: number | null): number {
  if (daysLeft === null || daysLeft < 0) return 1
  return 1 + 14 / (daysLeft + 7)
}

// ---------- Prioritering av temaer ----------

/** Forfaller temaet til repetisjon i dag (eller er det aldri repetert)? */
export function isDue(topic: ExamTopic, today: string): boolean {
  return topic.nextReview === null || topic.nextReview <= today
}

/**
 * Hvor viktig det er å repetere et tema nå:
 *   (6 − trygghet) × viktighet × 1,5 hvis det forfaller i dag
 * Lav trygghet og høy viktighet gir høyest prioritet.
 */
export function topicPriority(topic: ExamTopic, today: string): number {
  return (6 - topic.confidence) * IMPORTANCE_WEIGHT[topic.importance] * (isDue(topic, today) ? 1.5 : 1)
}

export function sortByPriority(topics: ExamTopic[], today: string): ExamTopic[] {
  return [...topics].sort((a, b) => topicPriority(b, today) - topicPriority(a, today) || a.sortOrder - b.sortOrder)
}

/** "Klar for eksamen": andelen temaer med trygghet 4 eller 5. */
export function readiness(topics: ExamTopic[]): number {
  return topics.length ? topics.filter((t) => t.confidence >= 4).length / topics.length : 0
}

// ---------- Spaced repetition ----------

/**
 * Neste repetisjon ut fra hvor trygg du er etter økten.
 * Lav trygghet → snart igjen (1 dag). Høy trygghet → lengre og lengre mellomrom,
 * fordi det forrige mellomrommet ganges opp. Aldri etter eksamen: senest dagen før.
 */
const GROWTH: Record<number, number> = { 1: 0, 2: 1, 3: 1.5, 4: 2.2, 5: 3 }

export function scheduleNext(previousInterval: number, confidence: number, today: string, examDate: string | null): { intervalDays: number; nextReview: string } {
  let interval = confidence <= 1 ? 1 : Math.max(confidence, Math.round(Math.max(1, previousInterval) * GROWTH[confidence]))
  if (confidence === 2) interval = 2
  if (examDate) {
    const daysToExam = daysBetween(today, examDate)
    if (daysToExam > 1) interval = Math.min(interval, daysToExam - 1)
    else interval = 1
  }
  return { intervalDays: interval, nextReview: shiftDate(today, interval) }
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

// ---------- Realismesjekk ----------

/** Omtrent hvor mange repetisjonsøkter et tema trenger for å komme opp på trygghet 4. */
export const SESSIONS_TO_READY: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0 }

export interface RealismCheck {
  neededHours: number
  availableHours: number
  enough: boolean
  prioritize: ExamTopic[] // det du bør bruke tiden på
  deprioritize: ExamTopic[] // det som kan vente hvis tiden ikke strekker til
}

/**
 * Rekker du å bli trygg på alle temaene før eksamen?
 * Tilgjengelig tid = dager igjen × (ukemål i eksamensmodus / 7) × fagets andel.
 * Er det for lite, velges temaene med høyest prioritet til tiden er brukt opp.
 */
export function realismCheck(args: { topics: ExamTopic[]; daysLeft: number; weeklyGoal: number; subjectShare: number; workMinutes: number; today: string }): RealismCheck {
  const hoursFor = (t: ExamTopic) => (SESSIONS_TO_READY[t.confidence] * args.workMinutes) / 60
  const open = sortByPriority(args.topics.filter((t) => t.confidence < 4), args.today)
  const neededHours = open.reduce((sum, t) => sum + hoursFor(t), 0)
  const availableHours = Math.max(0, args.daysLeft) * (args.weeklyGoal / 7) * args.subjectShare

  const prioritize: ExamTopic[] = []
  const deprioritize: ExamTopic[] = []
  let used = 0
  for (const t of open) {
    if (used + hoursFor(t) <= availableHours || prioritize.length === 0) {
      prioritize.push(t)
      used += hoursFor(t)
    } else deprioritize.push(t)
  }
  return { neededHours, availableHours, enough: neededHours <= availableHours, prioritize, deprioritize }
}

/** Ærlig tekst til realismesjekken. */
export function describeRealism(check: RealismCheck, code: string): string {
  if (check.neededHours === 0) return `Alle temaene i ${code} er på trygghet 4–5. Hold dem ved like med korte repetisjoner.`
  if (check.enough) return `Det ser ut til å gå: temaene i ${code} trenger ca. ${formatHours(check.neededHours)} t, og du har ca. ${formatHours(check.availableHours)} t.`
  const low = check.deprioritize.filter((t) => t.importance === 'low').map((t) => t.title)
  return (
    `Du rekker trolig ikke alt i ${code}: det trengs ca. ${formatHours(check.neededHours)} t, men det er ca. ${formatHours(check.availableHours)} t igjen. ` +
    `Prioriter ${check.prioritize
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ')}.` +
    (low.length ? ` ${low.slice(0, 3).join(', ')} har lav viktighet og kan nedprioriteres.` : '')
  )
}

/** "Fokus på konsumentteori i dag: høy eksamensvekt, trygghet 2/5, 11 dager til ITØK101." */
export function reviewReason(topic: ExamTopic, code: string, exam: Exam | undefined, now: Date): string {
  const days = exam ? daysUntil(exam.date, now) : null
  const parts = [`${IMPORTANCE_LABEL[topic.importance]} eksamensvekt`, `trygghet ${topic.confidence}/5`]
  if (days !== null && days >= 0) parts.push(days === 0 ? `${code}-eksamen i dag` : `${days} ${days === 1 ? 'dag' : 'dager'} til ${code}`)
  return `Fokus på ${topic.title.toLowerCase()} i dag: ${parts.join(', ')}.`
}
