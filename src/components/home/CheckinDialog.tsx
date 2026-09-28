import { useState, type FormEvent } from 'react'
import { useSaveCheckin } from '../../data/api'
import { defaultOutcome, type CheckinRow, type Outcome } from '../../lib/checkin'
import { readableOn } from '../../lib/color'
import { formatDuration } from '../../lib/tasks'
import { isAfter, isoToOsloParts, toUtcIso } from '../../lib/time'
import { sessionTitle } from '../../lib/dayPlanView'
import type { DayPlan, ExamTopic, Subject, Task } from '../../types'
import { Field, PrimaryButton, SecondaryButton } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { inputClass } from '../ui/styles'

const OUTCOMES: [Outcome, string][] = [
  ['helt', 'Helt'],
  ['delvis', 'Delvis'],
  ['ikke', 'Ikke'],
]

/**
 * "Ferdig for i dag": gå raskt gjennom dagens økter. Svarene er forhåndsutfylt
 * fra fokus-timeren, så du trenger bare å rette det som ikke stemmer.
 */
export function CheckinDialog({
  plan,
  subjects,
  tasks,
  topics,
  now,
  existingNote,
  onClose,
}: {
  plan: DayPlan
  subjects: Subject[]
  tasks: Task[]
  topics: ExamTopic[]
  now: Date
  existingNote: string | null
  onClose: () => void
}) {
  const nowIso = toUtcIso(now)
  // Økter som har startet, eller som timeren allerede har registrert. De som ikke har startet, flyttes automatisk.
  const sessions = plan.sessions.filter((s) => s.status !== 'moved' && (s.status !== 'planned' || !isAfter(s.startAt, now)))
  const [rows, setRows] = useState<CheckinRow[]>(() =>
    sessions.map((s) => ({ sessionId: s.id, subjectId: s.subjectId, taskId: s.taskId, kind: s.kind, plannedMinutes: s.plannedMinutes, ...defaultOutcome(s) })),
  )
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set())
  const [note, setNote] = useState(existingNote ?? '')
  const save = useSaveCheckin()

  const futureCount = plan.sessions.filter((s) => s.status === 'planned' && isAfter(s.startAt, now)).length
  const totalMinutes = rows.reduce((sum, r) => sum + (r.outcome === 'ikke' ? 0 : r.minutes), 0)

  const setRow = (id: string, changes: Partial<CheckinRow>) => setRows(rows.map((r) => (r.sessionId === id ? { ...r, ...changes } : r)))
  const setOutcome = (r: CheckinRow, outcome: Outcome) =>
    setRow(r.sessionId, { outcome, minutes: outcome === 'ikke' ? 0 : outcome === 'helt' ? Math.max(r.minutes, r.plannedMinutes) : r.minutes || Math.round(r.plannedMinutes / 2) })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({ plan, rows, tasks, tasksMarkedDone: doneTasks, note, nowIso })
    onClose()
  }

  // Vis "oppgaven er ferdig" bare én gang per oppgave
  const shownTaskIds = new Set<string>()

  return (
    <Modal onClose={onClose} label="Ferdig for i dag" width="40rem">
      <form onSubmit={handleSubmit}>
        <h2 className="font-serif text-3xl">Ferdig for i dag</h2>
        <p className="mt-1 text-sm text-muted">
          Hvordan gikk øktene? Svarene er fylt ut fra fokus-timeren, så rett bare det som ikke stemmer.
          {futureCount > 0 && ` ${futureCount} ${futureCount === 1 ? 'økt' : 'økter'} som ikke har startet, flyttes til kommende dager.`}
        </p>

        {rows.length === 0 && <p className="mt-6 text-sm text-muted">Ingen økter har startet ennå i dag.</p>}

        <ul className="mt-6 divide-y divide-line">
          {rows.map((r) => {
            const session = sessions.find((s) => s.id === r.sessionId)!
            const subject = subjects.find((s) => s.id === r.subjectId)
            const task = tasks.find((t) => t.id === r.taskId)
            const showDone = r.kind === 'task' && task && task.status !== 'done' && !shownTaskIds.has(task.id)
            if (task) shownTaskIds.add(task.id)
            return (
              <li key={r.sessionId} className="py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg">{sessionTitle(session, tasks, topics)}</p>
                    <p className="text-xs text-muted tabular">
                      {subject && <span style={{ color: readableOn(subject.color, '#FFFEFC') }}>{subject.code} · </span>}
                      {isoToOsloParts(session.startAt).time}–{isoToOsloParts(session.endAt).time}
                    </p>
                  </div>
                  <div role="radiogroup" aria-label="Hvordan gikk økten" className="inline-flex rounded-full bg-card p-1 text-sm">
                    {OUTCOMES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={r.outcome === value}
                        onClick={() => setOutcome(r, value)}
                        className={`min-h-9 rounded-full px-3.5 transition-colors ${r.outcome === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="w-24">
                    <Field label="Minutter">
                      <input
                        type="number"
                        min={0}
                        max={300}
                        step={5}
                        disabled={r.outcome === 'ikke'}
                        value={r.outcome === 'ikke' ? 0 : r.minutes}
                        onChange={(e) => setRow(r.sessionId, { minutes: Number(e.target.value) })}
                        className={`${inputClass} min-h-10 tabular disabled:opacity-40`}
                      />
                    </Field>
                  </div>
                </div>
                {showDone && (
                  <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={doneTasks.has(task.id)}
                      onChange={(e) => {
                        const next = new Set(doneTasks)
                        if (e.target.checked) next.add(task.id)
                        else next.delete(task.id)
                        setDoneTasks(next)
                      }}
                      className="size-4 accent-burgundy"
                    />
                    «{task.title}» er helt ferdig
                  </label>
                )}
              </li>
            )
          })}
        </ul>

        <Field label="Notat (valgfritt)" className="mt-4">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hva gikk bra, hva stoppet deg?" className={`${inputClass} py-2.5`} />
        </Field>

        {save.error && <p className="mt-4 text-sm text-burgundy">Kunne ikke lagre: {save.error.message}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={save.isPending}>
            {save.isPending ? 'Lagrer …' : 'Lagre innsjekk'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Avbryt
          </SecondaryButton>
          <span className="ml-auto text-sm text-muted tabular">I dag: {formatDuration(totalMinutes)}</span>
        </div>
      </form>
    </Modal>
  )
}
