import { useState, type FormEvent } from 'react'
import { useSaveDayPlan } from '../../data/api'
import { minutesToClock } from '../../lib/calendar'
import { buildPlanInput } from '../../lib/planner/fromAppData'
import { planDay } from '../../lib/planner/planDay'
import type { Energy } from '../../lib/planner/types'
import { formatDuration } from '../../lib/tasks'
import { clockToMinutes } from '../../lib/time'
import type { CalendarEvent, DayPlan, Settings, Subject, Task } from '../../types'
import { Field, PrimaryButton, SecondaryButton } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { inputClass } from '../ui/styles'

const ENERGY: [Energy, string][] = [
  ['low', 'Lav'],
  ['normal', 'Normal'],
  ['high', 'Høy'],
]

/**
 * "Start dagen": starttid, sluttid og energi → dagsplan.
 * Algoritmen kjøres på nytt hver gang du endrer noe, så du ser resultatet før du lagrer.
 */
export function StartDayDialog({
  date,
  now,
  settings,
  events,
  subjects,
  tasks,
  existing,
  onClose,
}: {
  date: string
  now: Date
  settings: Settings
  events: CalendarEvent[]
  subjects: Subject[]
  tasks: Task[]
  existing: DayPlan | null
  onClose: () => void
}) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [start, setStart] = useState(minutesToClock(Math.ceil(nowMinutes / 5) * 5)) // nåtid, rundet opp til nærmeste 5 min
  const [end, setEnd] = useState(existing?.endTime ?? settings.defaultEndTime)
  const [energy, setEnergy] = useState<Energy>(existing?.energy ?? 'normal')
  const save = useSaveDayPlan()

  const valid = clockToMinutes(end) > clockToMinutes(start)
  const output = valid ? planDay(buildPlanInput({ date, start, end, energy, now, settings, events, subjects, tasks })) : null
  const workMinutes = output?.sessions.reduce((sum, s) => sum + s.end - s.start, 0) ?? 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!output) return
    await save.mutateAsync({ date, start, end, energy, output, existing, nowIso: now.toISOString() })
    onClose()
  }

  return (
    <Modal onClose={onClose} label={existing ? 'Lag ny plan' : 'Start dagen'} width="32rem">
      <form onSubmit={handleSubmit}>
        <h2 className="font-serif text-3xl">{existing ? 'Lag ny plan' : 'Start dagen'}</h2>
        {existing && <p className="mt-1 text-sm text-muted">Øktene som allerede er over, beholdes. Resten lages på nytt fra starttiden.</p>}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Slutt">
            <input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} tabular`} />
          </Field>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-muted">Energi</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-card p-1 text-sm">
            {ENERGY.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={energy === value}
                onClick={() => setEnergy(value)}
                className={`min-h-10 rounded-full transition-colors ${energy === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Forhåndsvisning */}
        <div className="mt-6 rounded-2xl bg-card px-5 py-4" aria-live="polite">
          {!valid ? (
            <p className="text-sm text-burgundy">Sluttid må være etter starttid. Vil du jobbe i kveld, velg en senere sluttid.</p>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                {output!.sessions.length} økter · {formatDuration(workMinutes)}
              </p>
              <p className="mt-1.5 font-serif text-lg leading-snug italic">{output!.priority}</p>
              {output!.warnings.map((w) => (
                <p key={w} className="mt-2 text-sm text-burgundy">
                  {w}
                </p>
              ))}
            </>
          )}
        </div>

        {save.error && <p className="mt-4 text-sm text-burgundy">Kunne ikke lagre: {save.error.message}</p>}

        <div className="mt-8 flex gap-3">
          <PrimaryButton type="submit" disabled={!output || output.sessions.length === 0 || save.isPending}>
            {save.isPending ? 'Lager plan …' : 'Lag dagsplan'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Avbryt
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  )
}
