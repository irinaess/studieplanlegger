import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCheckin, useDayPlan, useStopDay } from '../../data/api'
import { useFocus } from '../../focus/FocusContext'
import { planBlocks } from '../../lib/dayPlanView'
import { clockToMinutes, isAfter, isoToOsloParts, toUtcIso } from '../../lib/time'
import type { CalendarEvent, PlanBlock, Settings, Subject, Task, TimeLog } from '../../types'
import { PrimaryButton, SecondaryButton } from '../ui/Field'
import { CheckinDialog } from './CheckinDialog'
import { DayPlanCard } from './DayPlanCard'
import { StartDayDialog } from './StartDayDialog'

/**
 * Dagens plan på forsiden. Uten plan: "Start dagen". Med plan: tidslinjen,
 * "Start fokus", "Ny plan", "Jeg må gi meg for i dag" og "Ferdig for i dag".
 */
export function TodayPlan({
  today,
  now,
  settings,
  subjects,
  events,
  tasks,
  logs,
  correctionFor,
}: {
  today: string
  now: Date
  settings: Settings
  subjects: Subject[]
  events: CalendarEvent[]
  tasks: Task[]
  logs: TimeLog[] // denne ukens tidslogger (algoritmen bruker dem til ukemålet)
  correctionFor: (task: Task) => number
}) {
  const planQuery = useDayPlan(today)
  const checkin = useCheckin(today)
  const stop = useStopDay()
  const focus = useFocus()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const plan = planQuery.data

  /** Start fokus-timeren på en økt fra planen og gå til Fokus-siden. */
  function startSession(block: PlanBlock) {
    const session = plan?.sessions.find((s) => s.id === block.id)
    if (!session) return
    const left = session.plannedMinutes - (session.actualMinutes ?? 0)
    focus.start({
      subjectId: session.subjectId,
      taskId: session.taskId,
      sessionId: session.id,
      title: block.title,
      workMinutes: left > 0 ? left : clockToMinutes(block.end) - clockToMinutes(block.start),
    })
    navigate('/fokus')
  }

  const dialog = dialogOpen && (
    <StartDayDialog date={today} now={now} settings={settings} events={events} subjects={subjects} tasks={tasks} logs={logs} correctionFor={correctionFor} existing={plan ?? null} onClose={() => setDialogOpen(false)} />
  )

  if (planQuery.isLoading) return <section className="h-64 rounded-[1.75rem] bg-surface shadow-soft" />

  if (!plan) {
    return (
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-2xl">Dagens plan</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Fortell når du starter, når du vil slutte og hvordan energien er, så setter appen opp dagen i fokusøkter rundt forelesningene dine.
        </p>
        <PrimaryButton type="button" onClick={() => setDialogOpen(true)} className="mt-6">
          Start dagen
        </PrimaryButton>
        {dialog}
      </section>
    )
  }

  const nowIso = toUtcIso(now)
  const hasRemaining = plan.sessions.some((s) => s.status === 'planned' && isAfter(s.endAt, now))
  const blocks = planBlocks({ plan, events, tasks, settings, nowMinutes: now.getHours() * 60 + now.getMinutes() })

  const actions = (
    <>
      <SecondaryButton type="button" onClick={() => setDialogOpen(true)} className="min-h-10 px-4">
        Ny plan
      </SecondaryButton>
      <SecondaryButton type="button" onClick={() => setCheckinOpen(true)} className="min-h-10 px-4">
        {checkin.data ? 'Endre innsjekk' : 'Ferdig for i dag'}
      </SecondaryButton>
      {hasRemaining && !plan.stoppedAt && !confirmStop && (
        <SecondaryButton type="button" onClick={() => setConfirmStop(true)} className="min-h-10 px-4">
          Jeg må gi meg for i dag
        </SecondaryButton>
      )}
    </>
  )

  const notice = (
    <>
      {confirmStop && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm">
          <span className="flex-1">Resten av dagens økter flyttes til kommende dager. Greit?</span>
          <button
            type="button"
            disabled={stop.isPending}
            onClick={async () => {
              await stop.mutateAsync({ plan, tasks, nowIso })
              setConfirmStop(false)
            }}
            className="min-h-10 rounded-full bg-ink px-4 text-paper hover:opacity-90"
          >
            Ja, gi meg
          </button>
          <button type="button" onClick={() => setConfirmStop(false)} className="min-h-10 px-2 text-muted hover:text-ink">
            Nei
          </button>
        </div>
      )}
      {plan.stoppedAt && (
        <p className="mt-4 rounded-xl bg-card px-4 py-3 text-sm text-muted">
          {checkin.data ? 'Du har sjekket inn for i dag.' : `Du ga deg kl. ${isoToOsloParts(plan.stoppedAt).time}.`} Det som ikke ble gjort, kommer med i planene de neste dagene.
        </p>
      )}
      {plan.warnings.map((w) => (
        <p key={w} className="mt-3 text-sm text-burgundy">
          {w}
        </p>
      ))}
      {stop.error && <p className="mt-3 text-sm text-burgundy">Noe gikk galt: {stop.error.message}</p>}
    </>
  )

  return (
    <>
      <DayPlanCard
        blocks={blocks}
        subjects={subjects}
        now={now}
        actions={actions}
        notice={notice}
        runningSessionId={focus.state?.sessionId ?? null}
        onStartSession={startSession}
      />
      {dialog}
      {checkinOpen && <CheckinDialog plan={plan} subjects={subjects} tasks={tasks} now={now} existingNote={checkin.data?.note ?? null} onClose={() => setCheckinOpen(false)} />}
    </>
  )
}
