import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLogFocus, useSettings } from '../data/api'
import { notify, requestNotificationPermission, unlockAudio } from '../lib/alerts'
import { toDateKey } from '../lib/calendar'
import * as timer from '../lib/timer'
import { toOslo } from '../lib/time'
import { FocusContext, type FocusApi, type PendingReview, type StartOptions } from './FocusContext'

/** Timeren lagres i nettleseren, så den overlever at siden lastes på nytt. */
const STORAGE_KEY = 'studieplanlegger.fokus'
/** Logger som ikke kom frem (f.eks. uten nett), og som sendes på nytt senere. */
const QUEUE_KEY = 'studieplanlegger.ventendeLogger'

type FocusLog = Parameters<ReturnType<typeof useLogFocus>['mutateAsync']>[0]

function loadQueue(): FocusLog[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as FocusLog[]
  } catch {
    return []
  }
}

function saveQueue(queue: FocusLog[]) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    else localStorage.removeItem(QUEUE_KEY)
  } catch {
    // ignorer
  }
}

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
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)
  const settings = useSettings()
  const logFocus = useLogFocus()

  // Siste verdier i "refs", så intervallet under alltid ser ferske data.
  const stateRef = useRef(state)
  const loggedRef = useRef<number | null>(null) // hvilken økt (workStartedAt) som allerede er logget
  const logRef = useRef(logFocus.mutateAsync)
  useEffect(() => {
    logRef.current = logFocus.mutateAsync
  }, [logFocus.mutateAsync])

  /**
   * Sender en logg. Feiler det (f.eks. uten nett), legges den i en kø i nettleseren
   * og sendes på nytt senere, så tiden aldri forsvinner i stillhet.
   */
  const send = useCallback(async (log: FocusLog) => {
    try {
      await logRef.current(log)
      return true
    } catch {
      saveQueue([...loadQueue(), log])
      setNotice('Fikk ikke lagret tiden akkurat nå. Den er tatt vare på og lagres når nettet er tilbake.')
      return false
    }
  }, [])

  // Prøv å sende ventende logger ved oppstart, hvert halve minutt og når nettet kommer tilbake.
  useEffect(() => {
    const flush = async () => {
      const queue = loadQueue()
      if (!queue.length || !navigator.onLine) return
      saveQueue([])
      const failed: FocusLog[] = []
      for (const log of queue) {
        try {
          await logRef.current(log)
        } catch {
          failed.push(log)
        }
      }
      saveQueue([...failed, ...loadQueue()])
    }
    flush()
    const id = setInterval(flush, 30_000)
    window.addEventListener('online', flush)
    return () => {
      clearInterval(id)
      window.removeEventListener('online', flush)
    }
  }, [])

  const update = useCallback((next: timer.TimerState | null) => {
    stateRef.current = next
    save(next)
    setState(next)
  }, [])

  const logWork = useCallback((s: timer.TimerState, work: timer.CompletedWork) => {
    if (loggedRef.current === s.workStartedAt) return // aldri logg samme økt to ganger
    loggedRef.current = s.workStartedAt
    // Repetisjonsøkt ferdig: spør hvor trygg du er nå (vises på Fokus-siden).
    if (s.topicId) setPendingReview({ topicId: s.topicId, title: s.title })
    send({
      date: toDateKey(toOslo(work.startedAt)),
      subjectId: s.subjectId,
      taskId: s.taskId,
      sessionId: s.sessionId,
      startedAt: new Date(work.startedAt).toISOString(),
      // Databasen krever at slutt ikke er før start
      endedAt: new Date(Math.max(work.endedAt, work.startedAt)).toISOString(),
      minutes: work.minutes,
    })
  }, [send])

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
      pendingReview,
      clearPendingReview: () => setPendingReview(null),
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
  }, [state, now, notice, pendingReview, settings.data?.breakMinutes, logWork, update])

  return <FocusContext.Provider value={api}>{children}</FocusContext.Provider>
}
