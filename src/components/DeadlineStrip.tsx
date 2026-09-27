import { readableOn } from '../lib/color'
import { countdownText, daysUntil } from '../lib/time'
import type { Subject, Task } from '../types'

/** Frister så nærme (i dager) får en diskret markering. */
const NEAR_DAYS = 2

/** Fristlinjen: kommende frister sortert etter nærmeste, med nedtelling. */
export function DeadlineStrip({ tasks, subjects, now }: { tasks: Task[]; subjects: Subject[]; now: Date }) {
  const upcoming = tasks
    .filter((t) => t.deadline)
    .map((t) => ({ task: t, days: daysUntil(t.deadline!, now) }))
    .sort((a, b) => a.task.deadline!.localeCompare(b.task.deadline!))

  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl">Frister</h2>
      {/* På smale skjermer kan fristene rulles sidelengs, uten at hele siden ruller. */}
      <ol className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
        {upcoming.map(({ task, days }) => {
          const subject = subjects.find((s) => s.id === task.subjectId)!
          const near = days <= NEAR_DAYS
          const time = new Date(task.deadline!).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
          return (
            <li
              key={task.id}
              className="flex w-60 shrink-0 snap-start flex-col rounded-lg border border-line bg-card p-4"
              style={{ borderLeft: `3px solid ${subject.color}` }}
            >
              <div className="flex items-center justify-between text-xs tracking-widest" style={{ color: readableOn(subject.color) }}>
                <span>{subject.code}</span>
                {task.starred && <span title="Må prioriteres" className="text-burgundy">★</span>}
              </div>
              <p className="mt-1 font-serif text-xl leading-snug">{task.title}</p>

              {task.subtasksTotal != null && (
                <div className="mt-3">
                  <div className="h-px w-full bg-line">
                    <div className="h-px" style={{ width: `${(task.subtasksDone! / task.subtasksTotal) * 100}%`, backgroundColor: subject.color }} />
                  </div>
                  <p className="mt-1 text-xs text-muted tabular">
                    {task.subtasksDone} av {task.subtasksTotal} ferdig
                  </p>
                </div>
              )}

              <p className={`mt-auto pt-3 text-sm tabular ${near ? 'text-burgundy' : 'text-muted'}`}>
                {near && <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-burgundy" />}
                {countdownText(days)}
                <span className="text-muted"> · kl. {time}</span>
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
