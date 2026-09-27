import { createContext, useContext } from 'react'
import type { TimerState } from '../lib/timer'

export interface StartOptions {
  subjectId: string
  taskId: string | null
  sessionId: string | null
  title: string
  workMinutes: number
}

export interface FocusApi {
  state: TimerState | null
  now: number
  /** Kort beskjed etter en fase, f.eks. "Pausen er over". */
  notice: string | null
  dismissNotice: () => void
  start: (opts: StartOptions) => void
  pause: () => void
  resume: () => void
  addFive: () => void
  /** Avslutter: logger jobbtiden så langt (i jobbfasen), eller hopper over pausen. */
  stop: () => void
}

export const FocusContext = createContext<FocusApi | null>(null)

/** Hent fokus-timeren fra hvor som helst i appen. */
export function useFocus(): FocusApi {
  const api = useContext(FocusContext)
  if (!api) throw new Error('useFocus må brukes inne i <FocusProvider>')
  return api
}
