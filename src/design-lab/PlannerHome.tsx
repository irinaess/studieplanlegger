/**
 * Design 2: "Luksuriøs planner"
 * Kort i lag av kremtoner med myke skygger, en visuell tidslinje for dagen
 * der øktene er blokker i fagfargene, og en fremdriftsring for ukemålet.
 */
import { useNow } from '../hooks/useNow'
import { readableOn, withAlpha } from '../lib/color'
import { formatLongDate, formatShortDateTime, countdownText, greetingFor, weekNumber, toOslo } from '../lib/time'
import { Bar, DEMO_NOW, ProgressRing, Reveal, SubjectDot, dayPlan, formatHours, homeData, semesterStart, streakDays, subjectById, toMin, useTaskDialog, type Block } from './shared'

const NEAR_DAYS = 3
const SOFT_SHADOW = 'shadow-[0_1px_2px_rgba(50,45,41,0.04),0_12px_32px_-12px_rgba(50,45,41,0.18)]'

export function PlannerHome() {
  const now = useNow()
  const { deadlines, examRows, perSubject, total, goal } = homeData(now)
  const { open, dialog } = useTaskDialog(now)

  return (
    <div className="min-h-screen bg-linear-to-b from-paper via-paper to-[#f1ebe3] text-ink">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-8">
        <header className="flex items-center justify-between motion-safe:animate-fade">
          <span className="font-serif text-lg tracking-wide">Studieplanlegger</span>
          <span className="rounded-full bg-card px-3 py-1 text-xs text-muted">
            <span className="text-burgundy">✦</span> {streakDays} dager på rad
          </span>
        </header>

        {/* Hovedkort i tre lag papir */}
        <Reveal className="relative mt-8 mb-6">
          <div aria-hidden className="absolute inset-x-10 -bottom-5 h-full rounded-[2rem] bg-sand/35" />
          <div aria-hidden className="absolute inset-x-5 -bottom-2.5 h-full rounded-[2rem] bg-card" />
          <div className={`relative grid items-center gap-8 rounded-[2rem] bg-surface p-7 sm:p-10 md:grid-cols-[1fr_auto] ${SOFT_SHADOW}`}>
            <div>
              <h1 className="font-script text-6xl leading-tight sm:text-7xl">{greetingFor(now.getHours())}</h1>
              <p className="mt-1 text-xs font-light uppercase tracking-[0.6em]">Iris</p>
              <p className="mt-5 text-sm text-muted">
                {formatLongDate(now)} <span className="mx-2 text-sand">|</span> Uke {weekNumber(now)}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {examRows.map(({ exam, subject, days }) => (
                  <li
                    key={exam.subjectId}
                    className="rounded-full px-3.5 py-1.5 text-xs tracking-wider"
                    style={{ backgroundColor: withAlpha(subject.color, 0.12), color: readableOn(subject.color) }}
                  >
                    {subject.code} <span className="opacity-50">·</span> <span className="font-bold tabular">{days} dager</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-6">
              <ProgressRing value={total / goal} size={176} stroke={9}>
                <span className="font-serif text-5xl leading-none tabular">{formatHours(total)}</span>
                <span className="mt-1 text-xs text-muted">av {goal} timer</span>
              </ProgressRing>
              <ul className="space-y-3 text-sm">
                {perSubject.map(({ subject, hours, goal }) => (
                  <li key={subject.id} className="flex items-center gap-2">
                    <SubjectDot subject={subject} />
                    <span className="w-16 tracking-wider" style={{ color: readableOn(subject.color) }}>
                      {subject.code}
                    </span>
                    <span className="text-muted tabular">
                      {formatHours(hours)}/{goal}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* Frister */}
        <section className="mt-14">
          <h2 className="mb-4 font-serif text-2xl">
            Frister <span className="ml-1 text-base text-muted">{deadlines.length}</span>
          </h2>
          <ol className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-6">
            {deadlines.map(({ task, subject, days }, i) => {
              const near = days < NEAR_DAYS
              return (
                <li key={task.id} className="shrink-0 snap-start motion-safe:animate-rise" style={{ animationDelay: `${200 + i * 80}ms` }}>
                  <button
                    type="button"
                    onClick={() => open(task.id)}
                    className={`flex h-full w-60 flex-col overflow-hidden rounded-2xl bg-surface text-left transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-burgundy ${SOFT_SHADOW} ${
                      near ? 'ring-2 ring-burgundy/70' : 'ring-1 ring-line/70'
                    }`}
                  >
                    <span className="h-1.5 w-full" style={{ backgroundColor: subject.color }} />
                    <span className="flex flex-1 flex-col p-5">
                      <span className="flex items-center justify-between text-xs tracking-widest" style={{ color: readableOn(subject.color) }}>
                        {subject.code}
                        {task.starred && <span className="text-burgundy">★</span>}
                      </span>
                      <span className="mt-2 font-serif text-xl leading-snug">{task.title}</span>
                      {task.subtasksTotal != null && (
                        <span className="mt-3 block">
                          <Bar value={task.subtasksDone! / task.subtasksTotal} color={subject.color} className="h-1" delay={500 + i * 80} />
                          <span className="mt-1 block text-xs text-muted">
                            {task.subtasksDone} av {task.subtasksTotal} ferdig
                          </span>
                        </span>
                      )}
                      <span className="mt-auto flex items-baseline justify-between pt-4">
                        <span className={`text-sm font-bold ${near ? 'text-burgundy' : ''}`}>{countdownText(days)}</span>
                        <span className="text-xs text-muted tabular">{formatShortDateTime(task.deadline!).split(' ').slice(0, 3).join(' ')}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.35fr_1fr]">
          {/* Dagens plan som tidslinje */}
          <Reveal delay={250} className={`rounded-[1.75rem] bg-surface p-6 sm:p-8 ${SOFT_SHADOW}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl">Dagens plan</h2>
              <span className="text-xs text-muted">08:00–16:00 · energi normal</span>
            </div>
            <Timeline blocks={dayPlan} from={8} to={16} now={DEMO_NOW} />
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={350} className={`rounded-[1.75rem] bg-card p-6 sm:p-8 ${SOFT_SHADOW}`}>
              <h2 className="font-serif text-2xl">Fag denne uken</h2>
              <ul className="mt-6 flex justify-between gap-2">
                {perSubject.map(({ subject, hours, goal }, i) => (
                  <li key={subject.id} className="flex flex-col items-center gap-2">
                    <ProgressRing value={hours / goal} size={84} stroke={5} color={subject.color} track="var(--color-surface)" delay={500 + i * 150}>
                      <span className="font-serif text-xl tabular">{Math.round((hours / goal) * 100)}%</span>
                    </ProgressRing>
                    <span className="text-xs tracking-wider" style={{ color: readableOn(subject.color) }}>
                      {subject.code}
                    </span>
                    <span className="-mt-1 text-xs text-muted tabular">
                      {formatHours(hours)} / {goal} t
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={450} className={`rounded-[1.75rem] bg-surface p-6 sm:p-8 ${SOFT_SHADOW}`}>
              <h2 className="font-serif text-2xl">Eksamen</h2>
              <ul className="mt-5 space-y-5">
                {examRows.map(({ exam, subject, days }, i) => {
                  // Hvor langt vi har kommet fra semesterstart til eksamen.
                  const start = toOslo(semesterStart).getTime()
                  const elapsed = (now.getTime() - start) / (toOslo(exam.date).getTime() - start)
                  return (
                    <li key={exam.subjectId}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2">
                          <SubjectDot subject={subject} />
                          <span className="text-sm tracking-wider" style={{ color: readableOn(subject.color) }}>
                            {subject.code}
                          </span>
                          <span className="text-xs text-muted">{formatShortDateTime(exam.date).split(' ').slice(0, 3).join(' ')}</span>
                        </span>
                        <span className="font-serif text-3xl tabular">
                          {days}
                          <span className="ml-1 text-sm text-muted">d</span>
                        </span>
                      </div>
                      <Bar value={elapsed} color={subject.color} className="mt-2 h-1" delay={600 + i * 150} />
                    </li>
                  )
                })}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
      {dialog}
    </div>
  )
}

/** Vertikal tidslinje: timelinjer til venstre, økter som blokker plassert etter klokkeslett. */
function Timeline({ blocks, from, to, now }: { blocks: Block[]; from: number; to: number; now: string }) {
  const PX_PER_MIN = 1.15
  const y = (hhmm: string) => (toMin(hhmm) - from * 60) * PX_PER_MIN
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)

  return (
    <div className="relative mt-6" style={{ height: (to - from) * 60 * PX_PER_MIN }}>
      {hours.map((h) => (
        <div key={h} className="absolute inset-x-0 flex items-center gap-3" style={{ top: (h - from) * 60 * PX_PER_MIN }}>
          <span className="w-9 -translate-y-px text-right text-[11px] text-muted tabular">{String(h).padStart(2, '0')}:00</span>
          <span className="h-px flex-1 bg-line/70" />
        </div>
      ))}

      <div className="absolute inset-y-0 right-0 left-12">
        {blocks.map((b, i) => {
          if (b.kind === 'pause') return null
          const top = y(b.start) + 2
          const height = y(b.end) - y(b.start) - 4
          if (b.kind === 'lunch')
            return (
              <div key={i} className="absolute inset-x-0 flex items-center justify-center rounded-xl border border-dashed border-sand text-xs tracking-[0.3em] text-muted uppercase" style={{ top, height }}>
                Lunsj
              </div>
            )

          const subject = subjectById(b.subjectId)!
          const active = b.status === 'active'
          const done = b.status === 'done'
          const style =
            b.kind === 'event'
              ? {
                  top,
                  height,
                  backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(subject.color, 0.1)} 0 7px, transparent 7px 14px)`,
                  border: `1px solid ${withAlpha(subject.color, 0.35)}`,
                }
              : active
                ? { top, height, backgroundColor: readableOn(subject.color, '#FAF8F5', 5), color: '#FAF8F5' }
                : { top, height, backgroundColor: withAlpha(subject.color, 0.13), borderLeft: `4px solid ${subject.color}` }

          const short = toMin(b.end) - toMin(b.start) < 40
          return (
            <div
              key={i}
              className={`absolute inset-x-0 flex ${short ? 'items-center py-0' : 'items-start py-2'} justify-between gap-2 overflow-hidden rounded-xl px-3.5 text-sm motion-safe:animate-rise ${done ? 'opacity-55' : ''} ${
                active ? 'shadow-[0_10px_24px_-10px_rgba(50,45,41,0.5)]' : ''
              }`}
              style={{ ...style, animationDelay: `${400 + i * 60}ms` }}
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
        <div className="absolute -left-12 flex w-12 items-center motion-safe:animate-fade" style={{ top: y(now) - 7, animationDelay: '900ms' }}>
          <span className="rounded-full bg-burgundy px-1.5 py-px text-[10px] text-paper tabular">{now}</span>
          <span className="h-px flex-1 bg-burgundy" />
        </div>
      </div>
    </div>
  )
}
