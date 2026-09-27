/**
 * Godkjenning av økter ut fra logget tid.
 *
 * Regelen (fra deg): en økt er godkjent når du har jobbet med faget så lenge
 * som økten var planlagt, uansett nøyaktig når eller med hva. Derfor:
 *  1. Tid logget direkte på en økt (startet fra planen) går først til den økten.
 *  2. Resten av dagens tid i faget, også frie økter, fordeles på fagets
 *     øvrige økter i kronologisk rekkefølge.
 *  3. Minst 80 % av planlagt tid = ferdig (done), noe tid = delvis (partial).
 * Økter som er flyttet eller merket "ikke gjort", røres ikke.
 */
import type { DayPlanSession, SessionStatus, TimeLog } from '../types'

export const APPROVAL_THRESHOLD = 0.8

export function approveSessions(sessions: DayPlanSession[], logs: TimeLog[]): Map<string, { status: SessionStatus; actualMinutes: number }> {
  const eligible = sessions.filter((s) => s.status !== 'moved' && s.status !== 'skipped').sort((a, b) => a.startAt.localeCompare(b.startAt))
  const credit = new Map(eligible.map((s) => [s.id, 0]))

  // Hvor mye tid hvert fag har i "potten" i dag
  const pool = new Map<string, number>()
  for (const log of logs) pool.set(log.subjectId, (pool.get(log.subjectId) ?? 0) + log.minutes)

  // 1. Tid logget direkte på en økt
  for (const s of eligible) {
    const direct = logs.filter((l) => l.sessionId === s.id).reduce((sum, l) => sum + l.minutes, 0)
    const used = Math.min(direct, s.plannedMinutes)
    credit.set(s.id, used)
    pool.set(s.subjectId, (pool.get(s.subjectId) ?? 0) - used)
  }

  // 2. Resten av fagets tid fordeles kronologisk
  for (const s of eligible) {
    const missing = s.plannedMinutes - credit.get(s.id)!
    const available = pool.get(s.subjectId) ?? 0
    const add = Math.max(0, Math.min(missing, available))
    credit.set(s.id, credit.get(s.id)! + add)
    pool.set(s.subjectId, available - add)
  }

  // 3. Status
  const result = new Map<string, { status: SessionStatus; actualMinutes: number }>()
  for (const s of eligible) {
    const minutes = credit.get(s.id)!
    const status: SessionStatus = minutes >= s.plannedMinutes * APPROVAL_THRESHOLD ? 'done' : minutes > 0 ? 'partial' : 'planned'
    result.set(s.id, { status, actualMinutes: minutes })
  }
  return result
}
