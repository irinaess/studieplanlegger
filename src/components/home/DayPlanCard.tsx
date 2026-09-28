import type { ReactNode } from 'react'
import { readableOn, withAlpha } from '../../lib/color'
import { formatDuration } from '../../lib/tasks'
import { clockToMinutes } from '../../lib/time'
import type { PlanBlock, Subject } from '../../types'
import { SubjectDot } from '../ui/SubjectDot'

const PX_PER_MIN = 1.15
const NEUTRAL = '#AC9C8D' // farge for hendelser uten fag

const KIND_LABEL: Record<string, string> = { event: 'fast', task: 'oppgaveøkt', subject: 'fagøkt', review: 'repetisjon' }
const STATUS_LABEL: Record<string, string> = { done: '✓', partial: 'delvis', skipped: 'ikke gjort', moved: 'flyttet', active: 'Nå' }

/**
 * Dagens plan: en linje om hva som pågår nå, og en vertikal tidslinje der
 * hver økt er en blokk plassert etter klokkeslett. `actions` vises øverst til høyre,
 * `notice` (advarsler o.l.) under overskriften.
 */
export function DayPlanCard({
  blocks,
  subjects,
  now,
  actions,
  notice,
  runningSessionId,
  onStartSession,
}: {
  blocks: PlanBlock[]
  subjects: Subject[]
  now: Date
  actions?: ReactNode
  notice?: ReactNode
  runningSessionId?: string | null // økten fokus-timeren kjører nå
  onStartSession?: (block: PlanBlock) => void
}) {
  const subjectOf = (id?: string) => subjects.find((s) => s.id === id)
  const sessions = blocks.filter((b) => (b.kind === 'task' || b.kind === 'subject' || b.kind === 'review') && b.status !== 'moved')
  const minutes = sessions.reduce((sum, b) => sum + clockToMinutes(b.end) - clockToMinutes(b.start), 0)
  const current = blocks.find((b) => b.status === 'active' && b.kind !== 'lunch')
  // Ingen pågående? Vis neste økt som ikke er gjort.
  const next = current ? null : blocks.find((b) => b.status === 'planned' && (b.kind === 'task' || b.kind === 'subject' || b.kind === 'review'))
  const highlighted = current ?? next
  const currentSubject = subjectOf(highlighted?.subjectId)
  const canStart = (b?: PlanBlock | null) => Boolean(b?.id && onStartSession && b.id !== runningSessionId)

  const from = Math.floor(Math.min(...blocks.map((b) => clockToMinutes(b.start))) / 60)
  const to = Math.ceil(Math.max(...blocks.map((b) => clockToMinutes(b.end))) / 60)

  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Dagens plan</h2>
          <p className="mt-0.5 text-xs text-muted tabular">
            {sessions.length} økter · {formatDuration(minutes)}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      {notice}

      {highlighted && (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-card px-4 py-3 text-sm">
          <span className="text-[10px] uppercase tracking-[0.3em] text-burgundy">{current ? 'Nå' : 'Neste'}</span>
          {currentSubject && <SubjectDot subject={currentSubject} />}
          <span className="font-serif text-lg">{highlighted.title}</span>
          {currentSubject && (
            <span className="text-xs tracking-wider" style={{ color: readableOn(currentSubject.color) }}>
              {currentSubject.code} · {KIND_LABEL[highlighted.kind]}
            </span>
          )}
          <span className="ml-auto flex items-center gap-3 text-xs text-muted tabular">
            {highlighted.start}–{highlighted.end}
            {highlighted.id && highlighted.id === runningSessionId && <span className="text-burgundy">Fokus pågår</span>}
            {canStart(highlighted) && (
              <button type="button" onClick={() => onStartSession!(highlighted)} className="min-h-9 rounded-full bg-burgundy px-4 text-xs text-paper hover:opacity-90">
                Start fokus
              </button>
            )}
          </span>
        </div>
      )}

      {blocks.length > 0 && <Timeline blocks={blocks} subjectOf={subjectOf} from={from} to={to} now={now} onStart={onStartSession} canStart={canStart} />}
    </section>
  )
}

function Timeline({
  blocks,
  subjectOf,
  from,
  to,
  now,
  onStart,
  canStart,
}: {
  blocks: PlanBlock[]
  subjectOf: (id?: string) => Subject | undefined
  from: number
  to: number
  now: Date
  onStart?: (block: PlanBlock) => void
  canStart: (block: PlanBlock) => boolean
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
              <div key={i} className="absolute inset-x-0 flex items-center justify-center rounded-xl border border-dashed border-sand bg-surface text-xs tracking-[0.3em] text-muted uppercase" style={{ top, height }}>
                Lunsj
              </div>
            )

          const subject = subjectOf(b.subjectId)
          const color = subject?.color ?? NEUTRAL
          const active = b.status === 'active'
          const faded = b.status === 'done' || b.status === 'past' || b.status === 'moved' || b.status === 'skipped'
          // Økter som ikke er ferdige kan klikkes for å starte fokus
          const clickable = (b.kind === 'task' || b.kind === 'subject' || b.kind === 'review') && (b.status === 'planned' || b.status === 'active' || b.status === 'partial') && canStart(b)
          const short = end - start < 40

          // Tre utseender: fast hendelse (skravert), pågående økt (fylt), andre økter (lys med stripe).
          const look =
            b.kind === 'event'
              ? {
                  backgroundColor: 'var(--color-surface)',
                  backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(color, 0.1)} 0 7px, transparent 7px 14px)`,
                  border: `1px solid ${withAlpha(color, 0.35)}`,
                }
              : active
                ? { backgroundColor: readableOn(color, '#FAF8F5', 5), color: '#FAF8F5' }
                : { background: `linear-gradient(${withAlpha(color, 0.13)}, ${withAlpha(color, 0.13)}), var(--color-surface)`, borderLeft: `4px solid ${color}` }

          const Tag = clickable ? 'button' : 'div'
          return (
            <Tag
              key={i}
              {...(clickable ? { type: 'button' as const, onClick: () => onStart?.(b), title: `Start fokus: ${b.title}` } : {})}
              className={[
                'absolute inset-x-0 flex justify-between gap-2 overflow-hidden rounded-xl px-3.5 text-left text-sm motion-safe:animate-rise',
                clickable ? 'cursor-pointer transition hover:shadow-lift' : '',
                short ? 'items-center' : 'items-start py-2',
                faded ? 'opacity-55' : '',
                active ? 'shadow-lift' : '',
              ].join(' ')}
              style={{ ...look, top, height, animationDelay: `${300 + i * 50}ms` }}
            >
              <span className={`min-w-0 ${short ? 'flex items-baseline gap-3' : ''}`}>
                <span className={`block truncate font-serif text-lg leading-tight ${b.status === 'moved' || b.status === 'skipped' ? 'line-through' : ''}`}>{b.title}</span>
                <span className="block truncate text-[11px] tracking-wider opacity-80">
                  {subject ? `${subject.code} · ` : ''}
                  {b.start}–{b.end}
                  {b.kind === 'event' && ' · fast'}
                </span>
              </span>
              <span className="shrink-0 text-xs">{STATUS_LABEL[b.status ?? ''] ?? ''}</span>
            </Tag>
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
