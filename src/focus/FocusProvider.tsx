import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLogFocus, useSettings } from '../data/api'
import { notify, requestNotificationPermission, unlockAudio } from '../lib/alerts'
import { toDateKey } from '../lib/calendar'
import * as timer from '../lib/timer'
import { toOslo } from '../lib/time'
import { FocusContext, type FocusApi, type StartOptions } from './FocusContext'

/** Timeren lagres i nettleseren, så den overlever at siden lastes på nytt. */
const STORAGE_KEY = 'studieplanlegger.fokus'

function load(): timer.TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as timer.TimerState) : null
  } catch {
    return null
  }
}

function save(state: timer.TimerState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // privat modus o.l.: timeren virker, men huskes ikke ved ny lasting
  }
}

/**
 * Holder fokus-timeren for hele appen. Sjekker hvert sekund om en fase er ferdig,
 * logger jobbtiden i databasen og varsler om pause.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<timer.TimerState | null>(load)
  const [now, setNow] = useState(() => Date.now())
  const [notice, setNotice] = useState<string | null>(null)
  const settings = useSettings()
  const logFocus = useLogFocus()

  // Siste verdier i "refs", så intervallet under alltid ser ferske data.
  const stateRef = useRef(state)
  const loggedRef = useRef<number | null>(null) // hvilken økt (workStartedAt) som allerede er logget
  const logRef = useRef(logFocus.mutate)
  useEffect(() => {
    logRef.current = logFocus.mutate
  }, [logFocus.mutate])

  const update = useCallback((next: timer.TimerState | null) => {
    stateRef.current = next
    save(next)
    setState(next)
  }, [])

  const logWork = useCallback((s: timer.TimerState, work: timer.CompletedWork) => {
    if (loggedRef.current === s.workStartedAt) return // aldri logg samme økt to ganger
    loggedRef.current = s.workStartedAt
    logRef.current({
      date: toDateKey(toOslo(work.startedAt)),
      subjectId: s.subjectId,
      taskId: s.taskId,
      sessionId: s.sessionId,
      startedAt: new Date(work.startedAt).toISOString(),
      endedAt: new Date(work.endedAt).toISOString(),
      minutes: work.minutes,
    })
  }, [])

  // Hvert sekund: oppdater klokka og sjekk om en fase er ferdig.
  useEffect(() => {
    const check = () => {
      const t = Date.now()
      setNow(t)
      const s = stateRef.current
      if (!s) return
      const result = timer.tick(s, t)
      if (result.completedWork) {
        logWork(s, result.completedWork)
        if (result.state) notify('Tid for pause', `${s.title} er ferdig. Ta ${Math.round(s.breakMs / 60_000)} minutter pause.`)
      }
      if (result.breakOver) {
        notify('Pausen er over', 'Klar for neste økt?')
        setNotice(result.completedWork ? 'Økten er logget, og pausen er over. Klar for neste?' : 'Pausen er over. Klar for neste økt?')
      }
      if (result.state !== s) update(result.state)
    }
    check() // med en gang, i tilfelle en fase ble ferdig mens appen var lukket
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [logWork, update])

  // Nedtellingen i fanens tittel, så du ser den fra andre faner.
  useEffect(() => {
    if (!state) {
      document.title = 'Studieplanlegger'
      return
    }
    document.title = `${timer.formatClock(timer.remainingMs(state, now))} · ${state.phase === 'work' ? state.title : 'Pause'}`
  }, [state, now])

  const api = useMemo<FocusApi>(() => {
    const breakMinutes = settings.data?.breakMinutes ?? 10
    return {
      state,
      now,
      notice,
      dismissNotice: () => setNotice(null),
      start: (opts: StartOptions) => {
        unlockAudio()
        requestNotificationPermission()
        const current = stateRef.current
        if (current) {
          const work = timer.stop(current, Date.now())
          if (work) logWork(current, work)
        }
        setNotice(null)
        update(timer.startTimer({ ...opts, breakMinutes }, Date.now()))
      },
      pause: () => stateRef.current && update(timer.pause(stateRef.current, Date.now())),
      resume: () => stateRef.current && update(timer.resume(stateRef.current, Date.now())),
      addFive: () => stateRef.current && update(timer.addMinutes(stateRef.current, 5)),
      stop: () => {
        const s = stateRef.current
        if (!s) return
        const work = timer.stop(s, Date.now())
        if (work) logWork(s, work)
        update(null)
      },
    }
  }, [state, now, notice, settings.data?.breakMinutes, logWork, update])

  return <FocusContext.Provider value={api}>{children}</FocusContext.Provider>
}
