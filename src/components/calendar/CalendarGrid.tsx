import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import type { MouseEvent } from 'react'
import { layoutOverlaps, snapToQuarter, type Occurrence } from '../../lib/calendar'
import { readableOn, withAlpha } from '../../lib/color'
import type { Subject } from '../../types'

/**
 * Tidsrutenett med én kolonne per dato (7 i ukevisning, 1 i dagsvisning).
 * Hendelser plasseres etter klokkeslett. Klikk i en tom rute for å lage en ny hendelse der.
 */
export function CalendarGrid({
  dates,
  occurrences,
  subjects,
  today,
  nowMinutes,
  from,
  to,
  pxPerMin,
  onCreate,
  onSelect,
}: {
  dates: string[]
  occurrences: Record<string, Occurrence[]>
  subjects: Subject[]
  today: string
  nowMinutes: number
  from: number
  to: number
  pxPerMin: number
  onCreate: (date: string, startMinutes: number) => void
  onSelect: (occurrence: Occurrence) => void
}) {
  const hourHeight = 60 * pxPerMin
  const height = (to - from) * hourHeight
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const columns = `3.25rem repeat(${dates.length}, minmax(0, 1fr))`
  const single = dates.length === 1

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-soft">
      {/* Dagene øverst */}
      <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
        <div />
        {dates.map((date) => {
          const d = parseISO(date)
          const isToday = date === today
          return (
            <div key={date} className={`flex flex-col items-center py-3 ${single ? 'items-start px-4' : ''}`}>
              <span className={`text-[11px] uppercase tracking-[0.2em] ${isToday ? 'text-burgundy' : 'text-muted'}`}>{format(d, single ? 'EEEE' : 'EEE', { locale: nb }).replace('.', '')}</span>
              <span className={`mt-1 flex size-9 items-center justify-center rounded-full font-serif text-xl tabular ${isToday ? 'bg-burgundy text-paper' : ''}`}>{format(d, 'd')}</span>
            </div>
          )
        })}
      </div>

      {/* Timene og kolonnene */}
      <div className="grid" style={{ gridTemplateColumns: columns, height }}>
        <div className="relative">
          {hours.slice(0, -1).map((h) => (
            <span key={h} className="absolute right-2 text-[11px] text-muted tabular" style={{ top: (h - from) * hourHeight + 2 }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>

        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            items={occurrences[date] ?? []}
            subjects={subjects}
            isToday={date === today}
            nowMinutes={nowMinutes}
            from={from}
            to={to}
            pxPerMin={pxPerMin}
            roomy={single}
            onCreate={onCreate}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  date,
  items,
  subjects,
  isToday,
  nowMinutes,
  from,
  to,
  pxPerMin,
  roomy,
  onCreate,
  onSelect,
}: {
  date: string
  items: Occurrence[]
  subjects: Subject[]
  isToday: boolean
  nowMinutes: number
  from: number
  to: number
  pxPerMin: number
  roomy: boolean
  onCreate: (date: string, startMinutes: number) => void
  onSelect: (occurrence: Occurrence) => void
}) {
  const hourHeight = 60 * pxPerMin

  /** Klikk på tom plass: regn ut klokkeslettet fra hvor langt ned i kolonnen det ble klikket. */
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return // klikk på en hendelse håndteres av hendelsen
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    onCreate(date, snapToQuarter(from * 60 + y / pxPerMin - 15))
  }

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-copy border-l border-line/70 ${isToday ? 'bg-card/35' : ''}`}
    >
      {/* Tynne timelinjer. pointer-events-none så klikk går gjennom til kolonnen. */}
      {Array.from({ length: to - from }, (_, i) => (
        <div key={i} aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-line/60" style={{ top: i * hourHeight }} />
      ))}
      {layoutOverlaps(items).map((o, i) => {
        const subject = subjects.find((s) => s.id === o.event.subjectId)
        const color = subject?.color ?? '#AC9C8D'
        const top = (o.start - from * 60) * pxPerMin
        const height = Math.max((o.end - o.start) * pxPerMin - 2, 18)
        const tall = height > 56
        return (
          <button
            key={`${o.event.id}-${i}`}
            type="button"
            onClick={() => onSelect(o)}
            title={`${o.event.title} · ${o.event.startTime}–${o.event.endTime}${o.event.location ? ` · ${o.event.location}` : ''}`}
            className="absolute overflow-hidden rounded-lg px-2 py-1 text-left text-xs transition hover:z-10 hover:shadow-lift focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-burgundy motion-safe:animate-rise"
            style={{
              top: top + 1,
              height,
              left: `calc(${(o.column / o.columns) * 100}% + 2px)`,
              width: `calc(${100 / o.columns}% - 4px)`,
              // Fargetone oppå en tett bakgrunn, så timelinjene ikke synes gjennom
              background: `linear-gradient(${withAlpha(color, subject ? 0.16 : 0.22)}, ${withAlpha(color, subject ? 0.16 : 0.22)}), var(--color-surface)`,
              borderLeft: `3px solid ${color}`,
              animationDelay: `${i * 40}ms`,
            }}
          >
            <span className="flex items-start justify-between gap-1">
              <span className={`font-serif leading-tight text-ink ${roomy ? 'text-lg' : 'text-[15px]'} ${tall ? 'line-clamp-2' : 'truncate'}`}>{o.event.title}</span>
              {o.event.kind === 'recurring' && (
                <span aria-label="Fast hver uke" className="shrink-0 text-[10px] text-muted">
                  ↻
                </span>
              )}
            </span>
            {tall && (
              <span className="mt-0.5 block truncate text-[11px] tabular" style={{ color: readableOn(color, '#F4EFE9') }}>
                {subject ? `${subject.code} · ` : ''}
                {o.event.startTime}–{o.event.endTime}
              </span>
            )}
            {tall && o.event.location && <span className="block truncate text-[11px] text-muted">{o.event.location}</span>}
          </button>
        )
      })}

      {/* Nå-linje i dagens kolonne */}
      {isToday && nowMinutes >= from * 60 && nowMinutes <= to * 60 && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (nowMinutes - from * 60) * pxPerMin }}>
          <span className="-ml-1 size-2 rounded-full bg-burgundy" />
          <span className="h-px flex-1 bg-burgundy" />
        </div>
      )}
    </div>
  )
}
