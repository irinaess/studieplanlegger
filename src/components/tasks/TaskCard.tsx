import { useState } from 'react'
import { useToggleSubtask, useUpdateTask } from '../../data/api'
import { readableOn } from '../../lib/color'
import { formatDuration, moveWarning, subtaskProgress, urgency } from '../../lib/tasks'
import { countdownText, daysUntil, formatShortDateTime } from '../../lib/time'
import { TASK_TYPE_LABELS, type Subject, type Task } from '../../types'
import { Bar } from '../ui/Bar'
import { SubjectDot } from '../ui/SubjectDot'

/**
 * Én oppgave i listen. Rund knapp til venstre = ferdig/ikke ferdig, stjerne til høyre.
 * Klikk på tittelen åpner skjemaet. Deloppgaver kan krysses av direkte her.
 */
export function TaskCard({ task, subject, now, onOpen }: { task: Task; subject: Subject; now: Date; onOpen: () => void }) {
  const update = useUpdateTask()
  const toggleSubtask = useToggleSubtask()
  const [expanded, setExpanded] = useState(false)
  const done = task.status === 'done'
  const progress = subtaskProgress(task.subtasks)
  const level = task.deadline && !done ? urgency(task.deadline, now) : null
  const warning = !done ? moveWarning(task.moveCount) : null

  return (
    <article className={`flex gap-4 rounded-2xl bg-surface p-4 shadow-soft ring-1 sm:p-5 ${level === 'near' || level === 'overdue' ? 'ring-burgundy/50' : 'ring-line/60'} ${done ? 'opacity-60' : ''}`}>
      <button
        type="button"
        aria-label={done ? `Marker ${task.title} som ikke ferdig` : `Marker ${task.title} som ferdig`}
        aria-pressed={done}
        onClick={() => update.mutate({ id: task.id, changes: { status: done ? 'todo' : 'done' } })}
        className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors ${done ? 'border-burgundy bg-burgundy text-paper' : 'border-sand text-transparent hover:border-burgundy hover:text-burgundy/50'}`}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="group block w-full text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <SubjectDot subject={subject} />
            <span className="tracking-widest" style={{ color: readableOn(subject.color, '#FFFEFC') }}>
              {subject.code}
            </span>
            <span>· {TASK_TYPE_LABELS[task.type]}</span>
            <span>· {formatDuration(task.estimateMinutes)}</span>
          </span>
          <span className={`mt-1 block font-serif text-xl leading-snug underline-offset-4 group-hover:underline ${done ? 'line-through' : ''}`}>{task.title}</span>
        </button>

        {progress.total > 0 && (
          <div className="mt-3 max-w-sm">
            <Bar value={progress.done / progress.total} color={subject.color} />
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-1 flex min-h-8 items-center gap-1 text-xs text-muted hover:text-ink">
              {progress.done} av {progress.total} ferdig
              <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
            </button>
            {expanded && (
              <ul className="mt-1 space-y-1">
                {task.subtasks.map((s) => (
                  <li key={s.id}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                      <input type="checkbox" checked={s.done} onChange={(e) => toggleSubtask.mutate({ id: s.id, done: e.target.checked })} className="size-4 accent-burgundy" />
                      <span className={s.done ? 'text-muted line-through' : ''}>{s.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {warning && <p className="mt-2 text-xs italic text-muted">{warning}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
        <button
          type="button"
          aria-label={task.starred ? 'Fjern stjerne' : 'Marker som må prioriteres'}
          aria-pressed={task.starred}
          onClick={() => update.mutate({ id: task.id, changes: { starred: !task.starred } })}
          className={`flex size-9 items-center justify-center rounded-full text-lg transition-colors ${task.starred ? 'text-burgundy' : 'text-sand hover:text-burgundy/60'}`}
        >
          {task.starred ? '★' : '☆'}
        </button>
        {task.deadline && (
          <span className="text-sm tabular">
            <span className={`block ${level === 'near' || level === 'overdue' ? 'font-bold text-burgundy' : done ? '' : 'font-bold'}`}>{done ? 'Levert' : countdownText(daysUntil(task.deadline, now))}</span>
            <span className="block text-xs text-muted">{formatShortDateTime(task.deadline)}</span>
          </span>
        )}
      </div>
    </article>
  )
}
