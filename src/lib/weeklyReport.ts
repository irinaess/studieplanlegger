/**
 * Ukesrapporten: tallene for uka, nøkterne observasjoner og refleksjonsspørsmål.
 *
 * Tonen er bevisst ærlig og ikke overdrevent positiv: rapporten sier hva som
 * skjedde, peker på mønstre (f.eks. mange flyttinger), og lar deg reflektere selv.
 */
import type { DayPlan, Subject, Task } from '../types'
import { median } from './estimates'
import { formatHours } from './format'
import { isoToOsloParts } from './time'

export interface ReportQuestion {
  id: 'best' | 'pattern' | 'next'
  text: string
}

export interface WeeklyReport {
  totalHours: number
  goal: number
  perSubject: { subject: Subject; hours: number; goal: number }[]
  completedTasks: Task[]
  frequentlyMoved: Task[]
  plannedSessions: number
  missedSessions: number // flyttet eller ikke gjort
  estimateDeviation: { typical: number; n: number } | null // typisk avvik (median), 0,35 = 35 %
  streak: number
  observations: string[]
  questions: ReportQuestion[]
}

export function buildWeeklyReport(args: {
  weekDates: string[]
  subjects: Subject[]
  hoursBySubject: Record<string, number>
  goal: number
  tasks: Task[]
  plans: DayPlan[] // ukens dagsplaner
  actualByTask: Map<string, number>
  streak: number
}): WeeklyReport {
  const { weekDates, subjects, goal } = args
  const inWeek = (iso: string | null) => Boolean(iso && weekDates.includes(isoToOsloParts(iso).date))

  const perSubject = subjects.map((subject) => ({ subject, hours: args.hoursBySubject[subject.id] ?? 0, goal: subject.weeklyGoalHours }))
  const totalHours = perSubject.reduce((sum, s) => sum + s.hours, 0)
  const completedTasks = args.tasks.filter((t) => t.status === 'done' && inWeek(t.completedAt))
  const frequentlyMoved = args.tasks.filter((t) => t.status !== 'done' && t.moveCount >= 3).sort((a, b) => b.moveCount - a.moveCount)

  const sessions = args.plans.flatMap((p) => p.sessions)
  const missedSessions = sessions.filter((s) => s.status === 'moved' || s.status === 'skipped').length

  const deviations = completedTasks
    .filter((t) => (args.actualByTask.get(t.id) ?? 0) > 0)
    .map((t) => Math.abs(args.actualByTask.get(t.id)! - t.estimateMinutes) / t.estimateMinutes)
  // Median i stedet for snitt: én oppgave som gikk helt galt skal ikke dominere.
  const estimateDeviation = deviations.length ? { typical: median(deviations), n: deviations.length } : null

  // ---------- Observasjoner ----------
  const observations: string[] = []
  const percent = goal > 0 ? Math.round((totalHours / goal) * 100) : 0
  observations.push(
    totalHours >= goal
      ? `Du jobbet ${formatHours(totalHours)} av ${goal} timer. Ukemålet er nådd.`
      : `Du jobbet ${formatHours(totalHours)} av ${goal} timer (${percent} %).`,
  )

  const weakest = perSubject.filter((s) => s.goal > 0).sort((a, b) => a.hours / a.goal - b.hours / b.goal)[0]
  if (weakest && weakest.hours / weakest.goal < 0.6)
    observations.push(`${weakest.subject.code} fikk ${formatHours(weakest.hours)} av ${formatHours(weakest.goal)} timer, klart minst i forhold til målet.`)

  if (sessions.length === 0) observations.push('Ingen dagsplaner denne uken, så det er lite å si om hvordan planene holdt.')
  else if (missedSessions / sessions.length >= 0.25)
    observations.push(`${missedSessions} av ${sessions.length} planlagte økter ble flyttet eller ikke gjort. Enten har planene vært for ambisiøse, eller noe annet har tatt tiden.`)

  if (frequentlyMoved.length)
    observations.push(
      `${frequentlyMoved.length === 1 ? 'Én oppgave er' : `${frequentlyMoved.length} oppgaver er`} flyttet tre ganger eller mer: ${frequentlyMoved
        .slice(0, 3)
        .map((t) => `«${t.title}» (${t.moveCount})`)
        .join(', ')}.`,
    )

  if (estimateDeviation && estimateDeviation.typical >= 0.25)
    observations.push(`Estimatene bommet typisk med ${Math.round(estimateDeviation.typical * 100)} % på oppgavene du fullførte.`)

  // ---------- Spørsmål ----------
  let pattern: string
  if (frequentlyMoved.length) pattern = `Hva gjør at «${frequentlyMoved[0].title}» blir skjøvet på? Kan den deles opp, eller få en fast tid?`
  else if (weakest && weakest.hours / weakest.goal < 0.6) pattern = `Hva trenger ${weakest.subject.code} for å få mer tid neste uke?`
  else if (sessions.length && missedSessions / sessions.length >= 0.25) pattern = 'Hva tok tiden de gangene øktene ble flyttet?'
  else pattern = 'Hva stoppet deg oftest denne uken?'

  return {
    totalHours,
    goal,
    perSubject,
    completedTasks,
    frequentlyMoved,
    plannedSessions: sessions.length,
    missedSessions,
    estimateDeviation,
    streak: args.streak,
    observations,
    questions: [
      { id: 'best', text: 'Hva fungerte best denne uken?' },
      { id: 'pattern', text: pattern },
      { id: 'next', text: 'Hva er det viktigste å få til neste uke?' },
    ],
  }
}
