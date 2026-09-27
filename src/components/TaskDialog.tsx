import { useEffect, useRef } from 'react'
import { readableOn } from '../lib/color'
import { countdownText, daysUntil, formatShortDateTime } from '../lib/time'
import { TASK_TYPE_LABELS, type Subject, type Task } from '../types'

/**
 * Detaljvisning av en oppgave, som et vindu over siden.
 * Bruker nettleserens innebygde <dialog>: Esc lukker, og fokus håndteres riktig.
 * Redigering kommer i steg 4.
 */
export function TaskDialog({ task, subject, now, onClose }: { task: Task; subject: Subject; now: Date; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const hours = task.estimateMinutes / 60

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Klikk utenfor selve vinduet (på den mørke bakgrunnen) lukker det.
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/25"
    >
      <div className="p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs tracking-widest" style={{ color: readableOn(subject.color) }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
          {subject.code} · {subject.name}
        </p>
        <h2 className="mt-2 font-serif text-3xl">
          {task.title} {task.starred && <span className="align-middle text-xl text-burgundy">★</span>}
        </h2>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Type</dt>
          <dd>{TASK_TYPE_LABELS[task.type]}</dd>
          {task.deadline && (
            <>
              <dt className="text-muted">Frist</dt>
              <dd className="tabular">
                {formatShortDateTime(task.deadline)} · {countdownText(daysUntil(task.deadline, now))}
              </dd>
            </>
          )}
          <dt className="text-muted">Estimat</dt>
          <dd className="tabular">{hours.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} t</dd>
          {task.subtasksTotal != null && (
            <>
              <dt className="text-muted">Fremdrift</dt>
              <dd className="tabular">
                {task.subtasksDone} av {task.subtasksTotal} deloppgaver
              </dd>
            </>
          )}
        </dl>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="min-h-11 rounded-full border border-line px-5 text-sm hover:border-taupe"
          >
            Lukk
          </button>
        </div>
      </div>
    </dialog>
  )
}
