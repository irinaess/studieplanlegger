import { useState } from 'react'
import { readableOn } from '../../lib/color'
import { countdownText, daysUntil, formatShortDateTime } from '../../lib/time'
import type { Subject, Task } from '../../types'
import { Bar } from '../ui/Bar'
import { TaskDialog } from '../TaskDialog'

/** Frister med færre dager igjen enn dette markeres tydeligere. */
const NEAR_DAYS = 3

/**
 * Fristlinjen: én rad med klikkbare kort, sortert etter nærmeste frist.
 * Er det mange frister, kan raden rulles sidelengs.
 */
export function DeadlineStrip({ tasks, subjects, now }: { tasks: Task[]; subjects: Subject[]; now: Date }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const upcoming = tasks.filter((t) => t.deadline).sort((a, b) => a.deadline!.localeCompare(b.deadline!))
  const subjectOf = (task: Task) => subjects.find((s) => s.id === task.subjectId)!
  const openTask = tasks.find((t) => t.id === openTaskId)

  return (
    <section aria-labelledby="frister">
      <h2 id="frister" className="mb-4 font-serif text-2xl">
        Frister <span className="ml-1 text-base text-muted">{upcoming.length}</span>
      </h2>
      <ol className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-6">
        {upcoming.map((task, i) => (
          <li key={task.id} className="shrink-0 snap-start motion-safe:animate-rise" style={{ animationDelay: `${200 + i * 80}ms` }}>
            <DeadlineCard task={task} subject={subjectOf(task)} days={daysUntil(task.deadline!, now)} delay={500 + i * 80} onOpen={() => setOpenTaskId(task.id)} />
          </li>
        ))}
      </ol>

      {openTask && <TaskDialog task={openTask} subject={subjectOf(openTask)} now={now} onClose={() => setOpenTaskId(null)} />}
    </section>
  )
}

function DeadlineCard({ task, subject, days, delay, onOpen }: { task: Task; subject: Subject; days: number; delay: number; onOpen: () => void }) {
  const near = days < NEAR_DAYS

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        'flex h-full w-60 flex-col overflow-hidden rounded-2xl bg-surface text-left shadow-soft transition hover:-translate-y-1',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy',
        near ? 'ring-2 ring-burgundy/70' : 'ring-1 ring-line/70',
      ].join(' ')}
    >
      <span className="h-1.5 w-full" style={{ backgroundColor: subject.color }} />
      <span className="flex flex-1 flex-col p-5">
        <span className="flex items-center justify-between text-xs tracking-widest" style={{ color: readableOn(subject.color) }}>
          {subject.code}
          {task.starred && (
            <span className="text-burgundy" title="Må prioriteres">
              ★
            </span>
          )}
        </span>
        <span className="mt-2 font-serif text-xl leading-snug">{task.title}</span>

        {task.subtasksTotal != null && (
          <span className="mt-3 block">
            <Bar value={task.subtasksDone! / task.subtasksTotal} color={subject.color} delay={delay} />
            <span className="mt-1 block text-xs text-muted">
              {task.subtasksDone} av {task.subtasksTotal} ferdig
            </span>
          </span>
        )}

        <span className="mt-auto flex items-baseline justify-between gap-2 pt-4">
          <span className={`text-sm font-bold ${near ? 'text-burgundy' : ''}`}>{countdownText(days)}</span>
          <span className="text-xs text-muted tabular">{formatShortDateTime(task.deadline!)}</span>
        </span>
      </span>
    </button>
  )
}
