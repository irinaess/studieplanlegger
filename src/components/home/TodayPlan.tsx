import { useState } from 'react'
import { useDayPlan, useStopDay } from '../../data/api'
import { planBlocks } from '../../lib/dayPlanView'
import { isoToOsloParts } from '../../lib/time'
import type { CalendarEvent, Settings, Subject, Task } from '../../types'
import { PrimaryButton, SecondaryButton } from '../ui/Field'
import { DayPlanCard } from './DayPlanCard'
import { StartDayDialog } from './StartDayDialog'

/**
 * Dagens plan på forsiden. Uten plan: "Start dagen". Med plan: tidslinjen,
 * "Ny plan" og "Jeg må gi meg for i dag".
 */
export function TodayPlan({
  today,
  now,
  settings,
  subjects,
  events,
  tasks,
}: {
  today: string
  now: Date
  settings: Settings
  subjects: Subject[]
  events: CalendarEvent[]
  tasks: Task[]
}) {
  const planQuery = useDayPlan(today)
  const stop = useStopDay()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const plan = planQuery.data

  const dialog = dialogOpen && (
    <StartDayDialog date={today} now={now} settings={settings} events={events} subjects={subjects} tasks={tasks} existing={plan ?? null} onClose={() => setDialogOpen(false)} />
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

  const nowIso = now.toISOString()
  const hasRemaining = plan.sessions.some((s) => s.status === 'planned' && s.endAt > nowIso)
  const blocks = planBlocks({ plan, events, tasks, settings, nowMinutes: now.getHours() * 60 + now.getMinutes() })

  const actions = (
    <>
      <SecondaryButton type="button" onClick={() => setDialogOpen(true)} className="min-h-10 px-4">
        Ny plan
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
          Du ga deg kl. {isoToOsloParts(plan.stoppedAt).time}. Resten er flyttet og kommer med i planene de neste dagene.
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
      <DayPlanCard blocks={blocks} subjects={subjects} now={now} actions={actions} notice={notice} />
      {dialog}
    </>
  )
}
