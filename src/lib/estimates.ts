/**
 * Læring av tidsestimater.
 *
 * For hver ferdig oppgave sammenligner vi estimatet med faktisk tid:
 *   forhold = faktisk / estimat   (1,3 = tok 30 % lengre tid enn du trodde)
 *
 * Per fag og oppgavetype bruker vi medianen av forholdene. Medianen påvirkes lite
 * av én oppgave som gikk helt galt. Faktoren brukes først når det finnes minst
 * 3 oppgaver, og får full vekt ved 6. Før det dras den mot 1, så planen ikke
 * hopper rundt etter en enkelt uke.
 */
import type { Subject, Task, TaskType } from '../types'

export const MIN_SAMPLES = 3
export const FULL_TRUST_SAMPLES = 6
const MIN_FACTOR = 0.5
const MAX_FACTOR = 2.5

export interface EstimateSample {
  taskId: string
  subjectId: string
  type: TaskType
  estimate: number
  actual: number
  ratio: number
}

export interface Correction {
  subjectId: string
  type: TaskType
  n: number // antall ferdige oppgaver
  medianRatio: number // hva du faktisk bruker, i forhold til estimatet
  factor: number // det planleggeren bruker (dratt mot 1 ved få oppgaver)
}

/**
 * Faktisk tid per oppgave. Tid kan komme fra fokus-timeren (tidslogger på oppgaven)
 * eller fra kveldsinnsjekken (minutter på oppgaveøkter). Vi tar den største,
 * så samme tid ikke telles to ganger.
 */
export function actualMinutesByTask(
  logs: { taskId: string | null; minutes: number }[],
  sessions: { taskId: string | null; actualMinutes: number | null }[],
): Map<string, number> {
  const fromLogs = new Map<string, number>()
  for (const l of logs) if (l.taskId) fromLogs.set(l.taskId, (fromLogs.get(l.taskId) ?? 0) + l.minutes)
  const fromSessions = new Map<string, number>()
  for (const s of sessions) if (s.taskId && s.actualMinutes) fromSessions.set(s.taskId, (fromSessions.get(s.taskId) ?? 0) + s.actualMinutes)

  const result = new Map<string, number>()
  for (const id of new Set([...fromLogs.keys(), ...fromSessions.keys()])) result.set(id, Math.max(fromLogs.get(id) ?? 0, fromSessions.get(id) ?? 0))
  return result
}

/** Ferdige oppgaver der vi vet hvor lang tid de tok. */
export function estimateSamples(tasks: Task[], actual: Map<string, number>): EstimateSample[] {
  return tasks
    .filter((t) => t.status === 'done' && (actual.get(t.id) ?? 0) > 0 && t.estimateMinutes > 0)
    .map((t) => {
      const minutes = actual.get(t.id)!
      return { taskId: t.id, subjectId: t.subjectId, type: t.type, estimate: t.estimateMinutes, actual: minutes, ratio: minutes / t.estimateMinutes }
    })
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Korreksjonsfaktor per fag og oppgavetype. */
export function corrections(samples: EstimateSample[]): Correction[] {
  const groups = new Map<string, EstimateSample[]>()
  for (const s of samples) {
    const key = `${s.subjectId}:${s.type}`
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  return [...groups.values()].map((group) => {
    const n = group.length
    const medianRatio = median(group.map((s) => s.ratio))
    const trust = n < MIN_SAMPLES ? 0 : Math.min(1, n / FULL_TRUST_SAMPLES)
    const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, 1 + (medianRatio - 1) * trust))
    return { subjectId: group[0].subjectId, type: group[0].type, n, medianRatio, factor }
  })
}

/** Faktoren for en bestemt oppgave (1 hvis vi ikke vet nok ennå). */
export function correctionFor(list: Correction[], task: Pick<Task, 'subjectId' | 'type'>): number {
  return list.find((c) => c.subjectId === task.subjectId && c.type === task.type)?.factor ?? 1
}

const TYPE_WORDS: Record<TaskType, string> = { oblig: 'obliger', ovinger: 'øvingsoppgaver', lesing: 'lesing', annet: 'andre oppgaver' }

/** "MAT111-øvingsoppgaver tar deg i snitt 30 % lengre tid enn du anslår (5 oppgaver)." */
export function describeCorrection(c: Correction, subjects: Subject[]): string {
  const code = subjects.find((s) => s.id === c.subjectId)?.code ?? 'Ukjent fag'
  const what = `${code}-${TYPE_WORDS[c.type]}`
  const percent = Math.round(Math.abs(c.medianRatio - 1) * 100)
  const count = `${c.n} ${c.n === 1 ? 'oppgave' : 'oppgaver'}`
  if (percent <= 10) return `${what} treffer estimatene dine godt (${count}).`
  const direction = c.medianRatio > 1 ? 'lengre' : 'kortere'
  const note = c.n < MIN_SAMPLES ? ' For få til å brukes i planen ennå.' : ''
  return `${what} tar deg i snitt ${percent} % ${direction} tid enn du anslår (${count}).${note}`
}
