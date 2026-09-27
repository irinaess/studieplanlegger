import { readableOn, withAlpha } from '../../lib/color'
import { clockToMinutes } from '../../lib/time'
import type { PlanBlock, Subject } from '../../types'
import { SubjectDot } from '../ui/SubjectDot'

const PX_PER_MIN = 1.15

const KIND_LABEL = { event: 'fast', task: 'oppgaveøkt', subject: 'fagøkt' } as const

/**
 * Dagens plan: en linje om hva som pågår nå, og en vertikal tidslinje
 * der hver økt er en blokk plassert etter klokkeslett.
 */
export function DayPlanCard({ blocks, subjects, now }: { blocks: PlanBlock[]; subjects: Subject[]; now: Date }) {
  const subjectOf = (id?: string) => subjects.find((s) => s.id === id)
  const current = blocks.find((b) => b.status === 'active')
  const currentSubject = subjectOf(current?.subjectId)

  // Tidslinjen går fra hel time før første blokk til hel time etter siste.
  const from = Math.floor(clockToMinutes(blocks[0].start) / 60)
  const to = Math.ceil(clockToMinutes(blocks.at(-1)!.end) / 60)
  const sessions = blocks.filter((b) => b.kind === 'task' || b.kind === 'subject')
  const done = sessions.filter((b) => b.status === 'done').length

  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">Dagens plan</h2>
        <span className="text-xs text-muted tabular">
          {done} av {sessions.length} økter ferdig
        </span>
      </div>

      {current && currentSubject && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-card px-4 py-3 text-sm">
          <span className="text-[10px] uppercase tracking-[0.3em] text-burgundy">Nå</span>
          <SubjectDot subject={currentSubject} />
          <span className="font-serif text-lg">{current.title}</span>
          <span className="text-xs tracking-wider" style={{ color: readableOn(currentSubject.color) }}>
            {currentSubject.code} · {KIND_LABEL[current.kind as keyof typeof KIND_LABEL]}
          </span>
          <span className="ml-auto text-xs text-muted tabular">
            {current.start}–{current.end}
          </span>
        </p>
      )}

      <Timeline blocks={blocks} subjectOf={subjectOf} from={from} to={to} now={now} />
    </section>
  )
}

function Timeline({
  blocks,
  subjectOf,
  from,
  to,
  now,
}: {
  blocks: PlanBlock[]
  subjectOf: (id?: string) => Subject | undefined
  from: number
  to: number
  now: Date
}) {
  const y = (minutes: number) => (minutes - from * 60) * PX_PER_MIN
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNow = nowMinutes >= from * 60 && nowMinutes <= to * 60

  return (
    <div className="relative mt-6" style={{ height: y(to * 60) }}>
      {hours.map((h) => (
        <div key={h} className="absolute inset-x-0 flex items-center gap-3" style={{ top: y(h * 60) }}>
          <span className="w-9 text-right text-[11px] text-muted tabular">{String(h).padStart(2, '0')}:00</span>
          <span className="h-px flex-1 bg-line/70" />
        </div>
      ))}

      <div className="absolute inset-y-0 right-0 left-12">
        {blocks.map((b, i) => {
          if (b.kind === 'pause') return null
          const start = clockToMinutes(b.start)
          const end = clockToMinutes(b.end)
          const top = y(start) + 2
          const height = y(end) - y(start) - 4

          if (b.kind === 'lunch')
            return (
              <div key={i} className="absolute inset-x-0 flex items-center justify-center rounded-xl border border-dashed border-sand text-xs tracking-[0.3em] text-muted uppercase" style={{ top, height }}>
                Lunsj
              </div>
            )

          const subject = subjectOf(b.subjectId)!
          const active = b.status === 'active'
          const done = b.status === 'done'
          const short = end - start < 40

          // Tre utseender: fast hendelse (skravert), pågående økt (fylt), andre økter (lys med stripe).
          const look =
            b.kind === 'event'
              ? {
                  backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(subject.color, 0.1)} 0 7px, transparent 7px 14px)`,
                  border: `1px solid ${withAlpha(subject.color, 0.35)}`,
                }
              : active
                ? { backgroundColor: readableOn(subject.color, '#FAF8F5', 5), color: '#FAF8F5' }
                : { backgroundColor: withAlpha(subject.color, 0.13), borderLeft: `4px solid ${subject.color}` }

          return (
            <div
              key={i}
              className={[
                'absolute inset-x-0 flex justify-between gap-2 overflow-hidden rounded-xl px-3.5 text-sm motion-safe:animate-rise',
                short ? 'items-center' : 'items-start py-2',
                done ? 'opacity-55' : '',
                active ? 'shadow-lift' : '',
              ].join(' ')}
              style={{ ...look, top, height, animationDelay: `${400 + i * 60}ms` }}
            >
              <span className={`min-w-0 ${short ? 'flex items-baseline gap-3' : ''}`}>
                <span className="block truncate font-serif text-lg leading-tight">{b.title}</span>
                <span className="block truncate text-[11px] tracking-wider opacity-80">
                  {subject.code} · {b.start}–{b.end}
                  {b.kind === 'event' && ' · fast'}
                </span>
              </span>
              <span className="shrink-0 text-xs">{done ? '✓' : active ? 'Nå' : ''}</span>
            </div>
          )
        })}

        {/* Nå-markør i margen, så den ikke krysser teksten i øktene */}
        {showNow && (
          <div className="absolute -left-12 flex w-12 items-center motion-safe:animate-fade" style={{ top: y(nowMinutes) - 7, animationDelay: '900ms' }}>
            <span className="rounded-full bg-burgundy px-1.5 py-px text-[10px] text-paper tabular">
              {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
            </span>
            <span className="h-px flex-1 bg-burgundy" />
          </div>
        )}
      </div>
    </div>
  )
}
