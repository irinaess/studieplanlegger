import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { EventDialog } from '../components/calendar/EventDialog'
import { PrimaryButton } from '../components/ui/Field'
import { useEvents, useSubjects, type EventDraft } from '../data/api'
import { useNow } from '../hooks/useNow'
import { isoWeekday, minutesToClock, occurrencesOn, shiftDate, toDateKey, visibleHours, weekDates } from '../lib/calendar'
import { weekNumber } from '../lib/time'

type View = 'uke' | 'dag'

/**
 * Kalenderen. Hvilken dato og visning du ser på ligger i adressen
 * (f.eks. /kalender?dato=2026-09-28&visning=dag), så den huskes ved oppdatering.
 */
export function CalendarPage() {
  const now = useNow()
  const today = toDateKey(now)
  const [params, setParams] = useSearchParams()
  const date = params.get('dato') ?? today
  // Smale skjermer starter i dagsvisning, ellers ukevisning.
  const view: View = (params.get('visning') as View) ?? (window.innerWidth < 640 ? 'dag' : 'uke')

  const events = useEvents()
  const subjects = useSubjects()
  const [editing, setEditing] = useState<EventDraft | null>(null)

  const activeSubjects = (subjects.data ?? []).filter((s) => !s.archived)
  const dates = view === 'uke' ? weekDates(date) : [date]
  const occurrences = Object.fromEntries(dates.map((d) => [d, occurrencesOn(events.data ?? [], d)]))
  const { from, to } = visibleHours(Object.values(occurrences).flat())

  const go = (changes: { dato?: string; visning?: View }) => setParams({ dato: changes.dato ?? date, visning: changes.visning ?? view })
  const step = view === 'uke' ? 7 : 1

  /** Ny hendelse med utgangspunkt i en dato og et klokkeslett. */
  function createAt(dateKey: string, startMinutes: number) {
    setEditing({
      subjectId: null,
      title: '',
      location: null,
      kind: 'recurring',
      weekday: isoWeekday(dateKey),
      date: dateKey,
      startTime: minutesToClock(startMinutes),
      endTime: minutesToClock(startMinutes + 105), // 2 × 45 min + pause, som en typisk forelesning
      validFrom: null,
      validUntil: null,
      countsAsStudy: false,
      source: 'manual',
    })
  }

  const week = weekDates(date)
  const title = view === 'uke' ? `Uke ${weekNumber(parseISO(date))}` : capitalize(format(parseISO(date), 'EEEE d. MMMM', { locale: nb }))
  const subtitle =
    view === 'uke'
      ? `${format(parseISO(week[0]), 'd. MMM', { locale: nb })} – ${format(parseISO(week[6]), 'd. MMM yyyy', { locale: nb })}`
      : `Uke ${weekNumber(parseISO(date))}`

  return (
    <div className="motion-safe:animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Visning" className="inline-flex rounded-full bg-card p-1 text-sm">
            {(['uke', 'dag'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => go({ visning: v })}
                className={`min-h-10 rounded-full px-4 capitalize transition-colors ${view === v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center rounded-full border border-line bg-surface">
            <NavButton label={view === 'uke' ? 'Forrige uke' : 'Forrige dag'} onClick={() => go({ dato: shiftDate(date, -step) })}>
              ‹
            </NavButton>
            <button type="button" onClick={() => go({ dato: today })} className="min-h-10 px-3 text-sm hover:text-burgundy">
              I dag
            </button>
            <NavButton label={view === 'uke' ? 'Neste uke' : 'Neste dag'} onClick={() => go({ dato: shiftDate(date, step) })}>
              ›
            </NavButton>
          </div>

          <PrimaryButton type="button" onClick={() => createAt(view === 'dag' ? date : dates.includes(today) ? today : dates[0], 10 * 60 + 15)}>
            + Ny hendelse
          </PrimaryButton>
        </div>
      </div>

      {events.error && <p className="mb-4 text-sm text-burgundy">Kunne ikke hente hendelser: {events.error.message}</p>}

      <CalendarGrid
        dates={dates}
        occurrences={occurrences}
        subjects={activeSubjects}
        today={today}
        nowMinutes={now.getHours() * 60 + now.getMinutes()}
        from={from}
        to={to}
        pxPerMin={view === 'uke' ? 0.9 : 1.2}
        onCreate={createAt}
        onSelect={(o) => setEditing({ ...o.event, date: o.event.date ?? o.date })}
      />

      <p className="mt-4 text-xs text-muted">Klikk i en tom rute for å legge til en hendelse der. ↻ betyr at hendelsen gjentas hver uke.</p>

      {editing && <EventDialog initial={editing} subjects={activeSubjects} onClose={() => setEditing(null)} />}
    </div>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex min-h-10 min-w-10 items-center justify-center rounded-full text-lg text-muted hover:text-ink">
      {children}
    </button>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
