import { useState } from 'react'
import { readableOn } from '../lib/color'
import { countdownText, daysUntil, formatShortDateTime } from '../lib/time'
import type { Subject, Task } from '../types'
import { TaskDialog } from './TaskDialog'

/** Frister med færre dager igjen enn dette markeres tydeligere. */
const NEAR_DAYS = 3

/**
 * Fristlinjen: én rad med klikkbare kort, sortert etter nærmeste frist.
 * Er det mange frister, kan raden rulles sidelengs.
 */
export function DeadlineStrip({ tasks, subjects, now }: { tasks: Task[]; subjects: Subject[]; now: Date }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const upcoming = tasks
    .filter((t) => t.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
  const subjectOf = (task: Task) => subjects.find((s) => s.id === task.subjectId)!
  const openTask = tasks.find((t) => t.id === openTaskId)

  return (
    <section aria-labelledby="frister">
      <h2 id="frister" className="mb-3 text-xs uppercase tracking-[0.3em] text-muted">
        Frister
      </h2>
      <ol className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3">
        {upcoming.map((task) => (
          <li key={task.id} className="shrink-0 snap-start">
            <DeadlineCard
              task={task}
              subject={subjectOf(task)}
              days={daysUntil(task.deadline!, now)}
              onOpen={() => setOpenTaskId(task.id)}
            />
          </li>
        ))}
      </ol>

      {openTask && <TaskDialog task={openTask} subject={subjectOf(openTask)} now={now} onClose={() => setOpenTaskId(null)} />}
    </section>
  )
}

function DeadlineCard({ task, subject, days, onOpen }: { task: Task; subject: Subject; days: number; onOpen: () => void }) {
  const near = days < NEAR_DAYS
  const hasProgress = task.subtasksTotal != null

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        'flex h-full w-56 flex-col rounded-xl border bg-surface p-4 text-left transition',
        'hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_rgba(50,45,41,0.25)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy',
        // Nære frister: kraftigere ramme i burgunder. Andre: tynn grå ramme som blir mørkere ved hover.
        near ? 'border-burgundy ring-1 ring-burgundy/40' : 'border-line hover:border-taupe',
      ].join(' ')}
    >
      <span className="flex items-center gap-2 text-xs tracking-widest" style={{ color: readableOn(subject.color) }}>
        <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
        {subject.code}
        {task.starred && (
          <span className="ml-auto text-burgundy" title="Må prioriteres">
            ★
          </span>
        )}
      </span>

      <span className="mt-2 font-serif text-xl leading-snug text-ink">{task.title}</span>

      <span className="mt-auto pt-3">
        <span className={`block text-sm font-bold tabular ${near ? 'text-burgundy' : 'text-ink'}`}>
          {countdownText(days)}
        </span>
        <span className="block text-xs text-muted tabular">
          {formatShortDateTime(task.deadline!)}
          {hasProgress && ` · ${task.subtasksDone} av ${task.subtasksTotal} ferdig`}
        </span>
      </span>
    </button>
  )
}
