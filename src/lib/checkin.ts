/**
 * Kveldsinnsjekk: fra svarene dine til endringene som skal lagres.
 */
import type { DayPlanSession, SessionStatus, TimeLog } from '../types'

export type Outcome = 'helt' | 'delvis' | 'ikke'

export interface CheckinRow {
  sessionId: string
  subjectId: string
  taskId: string | null
  kind: DayPlanSession['kind']
  plannedMinutes: number
  outcome: Outcome
  minutes: number // faktisk tid du oppgir
}

/** Forhåndsutfylt svar ut fra det timeren allerede vet. */
export function defaultOutcome(session: DayPlanSession): { outcome: Outcome; minutes: number } {
  if (session.status === 'done') return { outcome: 'helt', minutes: session.actualMinutes ?? session.plannedMinutes }
  if (session.status === 'partial') return { outcome: 'delvis', minutes: session.actualMinutes ?? 0 }
  return { outcome: 'ikke', minutes: 0 }
}

const STATUS: Record<Outcome, SessionStatus> = { helt: 'done', delvis: 'partial', ikke: 'skipped' }

/**
 * Regner ut hva som skal lagres:
 *  - ny status og faktisk tid for hver økt
 *  - ekstra tidslogg per fag hvis du oppgir mer tid enn timeren har logget
 *    (sammenlignes per fag, så tid fra frie økter ikke telles to ganger)
 *  - oppgaver som ikke ble helt ferdige i dag → flyttes (flyttetelleren økes én gang)
 */
export function checkinChanges(rows: CheckinRow[], logsToday: TimeLog[], tasksMarkedDone: Set<string>) {
  const sessionUpdates = rows.map((r) => ({ id: r.sessionId, status: STATUS[r.outcome], actualMinutes: r.outcome === 'ikke' ? 0 : Math.max(0, Math.round(r.minutes)) }))

  const reported = new Map<string, number>()
  for (const u of sessionUpdates) {
    const subjectId = rows.find((r) => r.sessionId === u.id)!.subjectId
    reported.set(subjectId, (reported.get(subjectId) ?? 0) + u.actualMinutes)
  }
  const extraLogs = [...reported.entries()]
    .map(([subjectId, minutes]) => ({ subjectId, minutes: minutes - logsToday.filter((l) => l.subjectId === subjectId).reduce((s, l) => s + l.minutes, 0) }))
    .filter((x) => x.minutes > 0)

  const movedTaskIds = [...new Set(rows.filter((r) => r.kind === 'task' && r.taskId && r.outcome !== 'helt' && !tasksMarkedDone.has(r.taskId)).map((r) => r.taskId!))]

  return { sessionUpdates, extraLogs, movedTaskIds }
}
