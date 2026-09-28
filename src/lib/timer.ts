/**
 * Fokus-timeren som rene funksjoner.
 *
 * Timeren teller ikke sekunder. Den husker når den startet og hvor lenge den
 * har stått på pause, og regner ut resten fra klokka hver gang den trenger det.
 * Derfor blir den riktig selv om fanen lukkes, eller iPaden går i dvale.
 */

export type Phase = 'work' | 'break'

export interface TimerState {
  subjectId: string
  taskId: string | null
  sessionId: string | null // økten i dagsplanen, hvis timeren ble startet derfra
  topicId?: string | null // eksamenstema, hvis det er en repetisjonsøkt
  title: string
  phase: Phase
  targetMs: number // lengden på denne fasen
  breakMs: number // lengden på pausen som kommer etter jobbfasen
  accumulatedMs: number // tid talt i denne fasen før siste start/fortsett
  runningSince: number | null // tidspunkt (ms) for siste start/fortsett, null = på pause
  workStartedAt: number // når jobbfasen startet (brukes i tidsloggen)
}

/** Ferdig jobbtid som skal logges. */
export interface CompletedWork {
  minutes: number
  startedAt: number
  endedAt: number
}

const MINUTE = 60_000

export function startTimer(
  opts: { subjectId: string; taskId: string | null; sessionId: string | null; topicId?: string | null; title: string; workMinutes: number; breakMinutes: number },
  now: number,
): TimerState {
  return {
    subjectId: opts.subjectId,
    taskId: opts.taskId,
    sessionId: opts.sessionId,
    topicId: opts.topicId ?? null,
    title: opts.title,
    phase: 'work',
    targetMs: opts.workMinutes * MINUTE,
    breakMs: opts.breakMinutes * MINUTE,
    accumulatedMs: 0,
    runningSince: now,
    workStartedAt: now,
  }
}

export function elapsedMs(s: TimerState, now: number): number {
  return s.accumulatedMs + (s.runningSince !== null ? now - s.runningSince : 0)
}

export function remainingMs(s: TimerState, now: number): number {
  return Math.max(0, s.targetMs - elapsedMs(s, now))
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.runningSince === null) return s
  return { ...s, accumulatedMs: elapsedMs(s, now), runningSince: null }
}

export function resume(s: TimerState, now: number): TimerState {
  if (s.runningSince !== null) return s
  return { ...s, runningSince: now }
}

export function addMinutes(s: TimerState, minutes: number): TimerState {
  return { ...s, targetMs: Math.max(MINUTE, s.targetMs + minutes * MINUTE) }
}

/**
 * Sjekker om en fase er ferdig.
 *  - Jobbfasen ferdig → tiden skal logges, og pausen starter
 *    (har det gått lenger tid, er pausen allerede i gang).
 *  - Pausen ferdig → timeren er ferdig (state = null).
 */
export function tick(s: TimerState, now: number): { state: TimerState | null; completedWork?: CompletedWork; breakOver?: boolean } {
  const elapsed = elapsedMs(s, now)
  if (elapsed < s.targetMs) return { state: s }

  if (s.phase === 'work') {
    const overshoot = elapsed - s.targetMs // hvor lenge siden jobbfasen egentlig ble ferdig
    const endedAt = s.runningSince !== null ? now - overshoot : now
    const completedWork = { minutes: Math.round(s.targetMs / MINUTE), startedAt: s.workStartedAt, endedAt }
    if (s.breakMs <= 0) return { state: null, completedWork, breakOver: true }
    const next: TimerState = { ...s, phase: 'break', targetMs: s.breakMs, accumulatedMs: overshoot, runningSince: s.runningSince !== null ? now : null }
    // Hvis pausen også er over (appen var lukket lenge), avslutt med en gang
    return next.accumulatedMs >= next.targetMs ? { state: null, completedWork, breakOver: true } : { state: next, completedWork }
  }
  return { state: null, breakOver: true }
}

/** Avslutter tidlig. Returnerer jobbtiden som skal logges (minst 1 minutt), eller null. */
export function stop(s: TimerState, now: number): CompletedWork | null {
  if (s.phase !== 'work') return null
  const minutes = Math.floor(elapsedMs(s, now) / MINUTE)
  return minutes >= 1 ? { minutes, startedAt: s.workStartedAt, endedAt: now } : null
}

/** 754 000 ms → "12:34" */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}
