/**
 * Design 1: "Magasin"
 * Redaksjonell layout: masthead med doble linjer, store serif-tall, små versaler
 * på seksjonstitler, nummererte seksjoner og tynne skillelinjer.
 */
import type { ReactNode } from 'react'
import { useNow } from '../hooks/useNow'
import { readableOn } from '../lib/color'
import { formatLongDate, formatShortDateTime, greetingFor, weekNumber } from '../lib/time'
import { Bar, DEMO_NOW, Reveal, clockTime, dayPlan, formatHours, homeData, minutesOf, streakDays, subjectById, useTaskDialog } from './shared'

const NEAR_DAYS = 3

export function MagazineHome() {
  const now = useNow()
  const { deadlines, examRows, perSubject, total, goal } = homeData(now)
  const { open, dialog } = useTaskDialog(now)

  const next = deadlines[0]
  const when = next.days === 0 ? 'i dag' : next.days === 1 ? 'i morgen' : `om ${next.days} dager`
  const ingress = `${deadlines.length} frister de neste ${deadlines.at(-1)!.days} dagene. Nærmest: ${next.task.title} i ${next.subject.code}, ${when} kl. ${clockTime(next.task.deadline!)}.`

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-10">
        {/* Masthead */}
        <header className="motion-safe:animate-fade">
          <div className="flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.35em] text-muted">
            <span>Studieplanlegger</span>
            <span className="hidden md:inline">Høst 2026 · Universitetet i Bergen</span>
            <span className="tabular">Uke {weekNumber(now)}</span>
          </div>
          <div className="mt-3 h-[5px] border-y border-ink" />
        </header>

        {/* Hilsen og ukens tall */}
        <section className="grid gap-10 py-10 md:grid-cols-12 md:py-16">
          <Reveal className="md:col-span-7">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">{formatLongDate(now)}</p>
            <h1 className="mt-5 font-script text-7xl leading-[0.95] sm:text-8xl">{greetingFor(now.getHours())}</h1>
            <p className="mt-4 text-xs font-light uppercase tracking-[0.6em]">Iris</p>
            <p className="mt-10 max-w-md border-l border-burgundy pl-5 font-serif text-2xl leading-snug italic text-ink/85">{ingress}</p>
          </Reveal>

          <Reveal delay={150} className="md:col-span-5 md:border-l md:border-line md:pl-10">
            <Label>Denne uken</Label>
            <p className="mt-3 font-serif leading-none tabular">
              <span className="text-8xl">{formatHours(total)}</span>
              <span className="ml-3 text-2xl text-muted">/ {goal} t</span>
            </p>
            <Bar value={total / goal} color="var(--color-burgundy)" className="mt-5 h-[2px]" track="bg-line" />
            <dl className="mt-8 border-t border-line">
              {perSubject.map(({ subject, hours, goal }, i) => (
                <div key={subject.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                  <dt className="text-xs tracking-[0.25em]" style={{ color: readableOn(subject.color) }}>
                    {subject.code}
                  </dt>
                  <dd className="flex flex-1 items-center gap-4">
                    <Bar value={hours / goal} color={subject.color} className="h-px" track="bg-line" delay={400 + i * 120} />
                    <span className="font-serif text-2xl whitespace-nowrap tabular">
                      {formatHours(hours)}
                      <span className="text-base text-muted"> / {goal}</span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-muted">
              Streak <span className="mx-1 font-serif text-lg tracking-normal text-ink normal-case">{streakDays}</span> dager på rad
            </p>
          </Reveal>
        </section>

        {/* 01 Frister */}
        <Section number="01" title="Frister">
          <ol className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-3">
            {deadlines.map(({ task, subject, days }, i) => {
              const near = days < NEAR_DAYS
              return (
                <li key={task.id} className="shrink-0 snap-start motion-safe:animate-rise" style={{ animationDelay: `${300 + i * 80}ms` }}>
                  <button
                    type="button"
                    onClick={() => open(task.id)}
                    className={`group flex h-full w-60 flex-col rounded-sm border bg-surface p-5 text-left transition hover:bg-card/40 focus-visible:outline-2 focus-visible:outline-burgundy ${
                      near ? 'border-burgundy' : 'border-line hover:border-ink'
                    }`}
                    style={{ borderTop: `3px solid ${near ? 'var(--color-burgundy)' : subject.color}` }}
                  >
                    <span className="flex items-baseline justify-between">
                      <span className="text-[11px] tracking-[0.25em]" style={{ color: readableOn(subject.color) }}>
                        {subject.code}
                      </span>
                      {near ? <span className="text-[10px] uppercase tracking-[0.3em] text-burgundy">Snart</span> : task.starred && <span className="text-burgundy">★</span>}
                    </span>
                    <span className="mt-4 flex items-baseline gap-2">
                      <span className={`font-serif text-6xl leading-none tabular ${near ? 'text-burgundy' : ''}`}>{days}</span>
                      <span className="text-[11px] uppercase tracking-[0.3em] text-muted">{days === 1 ? 'dag' : 'dager'}</span>
                    </span>
                    <span className="mt-4 font-serif text-xl leading-snug underline-offset-4 group-hover:underline">
                      {task.title} {near && task.starred && <span className="text-base text-burgundy">★</span>}
                    </span>
                    <span className="mt-auto pt-3 text-xs text-muted tabular">
                      {formatShortDateTime(task.deadline!)}
                      {task.subtasksTotal != null && ` · ${task.subtasksDone}/${task.subtasksTotal}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Section>

        <div className="mt-14 grid gap-14 md:grid-cols-12">
          {/* 02 Dagens plan */}
          <Section number="02" title="Dagens plan" className="md:col-span-7">
            <ol>
              {dayPlan.map((block, i) => {
                const subject = subjectById(block.subjectId)
                if (block.kind === 'pause') return null
                if (block.kind === 'lunch')
                  return (
                    <li key={i} className="border-b border-line py-2 text-center text-xs tracking-[0.3em] text-muted uppercase">
                      Lunsj · {block.start}–{block.end}
                    </li>
                  )
                const active = block.status === 'active'
                const done = block.status === 'done'
                return (
                  <li
                    key={i}
                    className={`grid grid-cols-[4rem_1fr_auto] items-baseline gap-4 border-b border-line py-3.5 motion-safe:animate-rise ${done ? 'text-muted' : ''}`}
                    style={{ animationDelay: `${400 + i * 50}ms` }}
                  >
                    <span className={`font-serif text-xl tabular ${active ? 'text-burgundy' : ''}`}>{block.start}</span>
                    <span>
                      <span className="font-serif text-xl">{block.title}</span>
                      <span className="mt-0.5 block text-[11px] tracking-[0.2em]" style={{ color: done ? undefined : readableOn(subject!.color) }}>
                        {subject!.code} · {block.kind === 'event' ? 'FAST' : block.kind === 'task' ? 'OPPGAVEØKT' : 'FAGØKT'}
                      </span>
                    </span>
                    <span className="text-right text-xs tabular">
                      {active ? <span className="text-[10px] uppercase tracking-[0.3em] text-burgundy">● Nå</span> : done ? '✓' : `${minutesOf(block)} min`}
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-xs text-muted">
              Klokken er {DEMO_NOW} i eksempelet · {dayPlan.filter((b) => b.status === 'done' && b.kind !== 'event').length} av{' '}
              {dayPlan.filter((b) => b.kind === 'task' || b.kind === 'subject').length} økter ferdig
            </p>
          </Section>

          {/* 03 Eksamen */}
          <Section number="03" title="Eksamen" className="md:col-span-5">
            <ol className="border-t border-line">
              {examRows.map(({ exam, subject, days }, i) => (
                <li key={exam.subjectId} className="flex items-end justify-between gap-4 border-b border-line py-5 motion-safe:animate-rise" style={{ animationDelay: `${500 + i * 100}ms` }}>
                  <span>
                    <span className="block text-[11px] tracking-[0.3em]" style={{ color: readableOn(subject.color) }}>
                      {subject.code}
                    </span>
                    <span className="mt-1 block font-serif text-xl">{subject.name}</span>
                    <span className="block text-xs text-muted">
                      {formatShortDateTime(exam.date)}
                      {exam.location && ` · ${exam.location}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-serif text-7xl leading-none tabular" style={{ color: readableOn(subject.color) }}>
                      {days}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-muted">dager</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
      {dialog}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] uppercase tracking-[0.35em] text-muted">{children}</p>
}

function Section({ number, title, className = '', children }: { number: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section className={className}>
      <div className="flex items-baseline gap-4 border-t border-ink pt-3">
        <span className="font-serif text-lg text-muted tabular">{number}</span>
        <h2 className="text-[11px] uppercase tracking-[0.35em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}
