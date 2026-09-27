import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDeleteTask, useSaveTask } from '../../data/api'
import { moveWarning, newTaskDraft, subtaskProgress } from '../../lib/tasks'
import { isoToOsloParts, osloToIso } from '../../lib/time'
import { TASK_TYPE_LABELS, type Subject, type Task, type TaskDraft, type TaskType } from '../../types'
import { Field, PrimaryButton, SecondaryButton } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { inputClass } from '../ui/styles'

const TYPES = Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]

let nextId = 0
const newSubtaskId = () => `new-${Date.now()}-${nextId++}`

/**
 * Skjema for å lage eller endre en oppgave.
 * `task` = eksisterende oppgave (redigering). Uten `task` lages en ny fra `initial`.
 */
export function TaskEditDialog({ task, initial, subjects, onClose }: { task?: Task; initial?: TaskDraft; subjects: Subject[]; onClose: () => void }) {
  const [draft, setDraft] = useState<TaskDraft>(task ?? initial ?? newTaskDraft(subjects[0]?.id ?? ''))
  const startParts = draft.deadline ? isoToOsloParts(draft.deadline) : null
  const [deadlineDate, setDeadlineDate] = useState(startParts?.date ?? '')
  const [deadlineTime, setDeadlineTime] = useState(startParts?.time ?? '23:59')
  const [bulkCount, setBulkCount] = useState(5)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveTask()
  const remove = useDeleteTask()
  const isNew = !task
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft({ ...draft, [key]: value })

  // Når en ny deloppgave legges til, flyttes markøren dit.
  const listRef = useRef<HTMLUListElement>(null)
  const previousCount = useRef(draft.subtasks.length)
  useEffect(() => {
    if (draft.subtasks.length === previousCount.current + 1) {
      listRef.current?.querySelector<HTMLInputElement>('li:last-child input[type=text]')?.focus()
    }
    previousCount.current = draft.subtasks.length
  }, [draft.subtasks.length])

  const updateSubtask = (id: string, changes: { title?: string; done?: boolean }) =>
    set('subtasks', draft.subtasks.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  const addSubtask = (title = '') => set('subtasks', [...draft.subtasks, { id: newSubtaskId(), title, done: false, sortOrder: draft.subtasks.length }])
  const addNumbered = () => {
    const start = draft.subtasks.length
    const added = Array.from({ length: bulkCount }, (_, i) => ({ id: newSubtaskId(), title: `Oppgave ${start + i + 1}`, done: false, sortOrder: start + i }))
    set('subtasks', [...draft.subtasks, ...added])
  }

  async function submit(status = draft.status) {
    const deadline = deadlineDate ? osloToIso(deadlineDate, deadlineTime || '23:59') : null
    const completedAt = status === 'done' ? (draft.completedAt ?? new Date().toISOString()) : null
    await save.mutateAsync({ task: { ...draft, deadline, status, completedAt }, previous: task })
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  async function handleDelete() {
    await remove.mutateAsync(task!.id)
    onClose()
  }

  const showSubtasks = draft.type === 'oblig' || draft.subtasks.length > 0
  const progress = subtaskProgress(draft.subtasks.filter((s) => s.title.trim()))
  const warning = moveWarning(draft.moveCount)
  const error = save.error?.message ?? remove.error?.message

  return (
    <Modal onClose={onClose} label={isNew ? 'Ny oppgave' : draft.title} width="38rem">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-3xl">{isNew ? 'Ny oppgave' : 'Rediger oppgave'}</h2>
          <button
            type="button"
            aria-pressed={draft.starred}
            onClick={() => set('starred', !draft.starred)}
            className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm transition-colors ${draft.starred ? 'bg-burgundy/10 text-burgundy' : 'text-muted hover:text-ink'}`}
          >
            {draft.starred ? '★' : '☆'} Må prioriteres
          </button>
        </div>

        {warning && <p className="mt-3 rounded-xl bg-card px-4 py-2.5 text-sm italic text-muted">{warning} Kanskje den trenger å deles opp, eller få en fast tid i kalenderen?</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Tittel" className="sm:col-span-2">
            <input required data-autofocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Oblig 3" className={inputClass} />
          </Field>

          <Field label="Fag">
            <select required value={draft.subjectId} onChange={(e) => set('subjectId', e.target.value)} className={inputClass}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select value={draft.type} onChange={(e) => set('type', e.target.value as TaskType)} className={inputClass}>
              {TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Field label="Estimat (timer)" hint="Totalt, omtrent." className="w-full sm:w-36 sm:shrink-0">
            <input
              type="number"
              required
              min={0.25}
              max={200}
              step={0.25}
              value={draft.estimateMinutes / 60}
              onChange={(e) => set('estimateMinutes', Number(e.target.value) * 60)}
              className={`${inputClass} tabular`}
            />
          </Field>

          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-muted">Frist</span>
            <div className="flex gap-2">
              <input type="date" aria-label="Fristdato" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className={`${inputClass} min-w-0 flex-1 tabular`} />
              {/* Fast bredde settes på en boks rundt, fordi inputClass alltid er full bredde */}
              <div className="w-28 shrink-0">
                <input type="time" aria-label="Klokkeslett" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} disabled={!deadlineDate} className={`${inputClass} tabular disabled:opacity-40`} />
              </div>
            </div>
            {deadlineDate ? (
              <button type="button" onClick={() => setDeadlineDate('')} className="mt-1 text-xs text-muted hover:text-burgundy">
                Fjern frist
              </button>
            ) : (
              <span className="mt-1 block text-xs text-muted">Valgfritt</span>
            )}
          </div>
        </div>

        {showSubtasks && (
          <section className="mt-6 rounded-2xl border border-line p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted">Deloppgaver</h3>
              {progress.total > 0 && (
                <span className="text-xs text-muted tabular">
                  {progress.done} av {progress.total} ferdig
                </span>
              )}
            </div>

            <ul ref={listRef} className="mt-3 space-y-2">
              {draft.subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <input type="checkbox" aria-label={`${s.title} ferdig`} checked={s.done} onChange={(e) => updateSubtask(s.id, { done: e.target.checked })} className="size-5 shrink-0 accent-burgundy" />
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault() // Enter lager en ny deloppgave i stedet for å lagre skjemaet
                        addSubtask()
                      }
                    }}
                    placeholder="Beskriv deloppgaven"
                    className={`${inputClass} min-h-10 ${s.done ? 'text-muted line-through' : ''}`}
                  />
                  <button type="button" aria-label="Fjern deloppgave" onClick={() => set('subtasks', draft.subtasks.filter((x) => x.id !== s.id))} className="min-h-10 min-w-10 shrink-0 rounded-full text-muted hover:text-burgundy">
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button type="button" onClick={() => addSubtask()} className="min-h-10 text-muted hover:text-ink">
                + Legg til deloppgave
              </button>
              <span className="flex items-center gap-2 text-muted">
                eller lag
                <span className="w-16">
                  <input type="number" min={1} max={30} aria-label="Antall nummererte deloppgaver" value={bulkCount} onChange={(e) => setBulkCount(Math.max(1, Math.min(30, Number(e.target.value))))} className={`${inputClass} min-h-9 px-2 text-center tabular`} />
                </span>
                <button type="button" onClick={addNumbered} className="min-h-10 underline-offset-4 hover:text-ink hover:underline">
                  nummererte
                </button>
              </span>
            </div>
          </section>
        )}

        <Field label="Notater" className="mt-6">
          <textarea rows={2} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Lenker, sidetall, hva du står fast på …" className={`${inputClass} py-2.5`} />
        </Field>

        {error && (
          <p role="alert" className="mt-4 text-sm text-burgundy">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={save.isPending}>
            {save.isPending ? 'Lagrer …' : 'Lagre'}
          </PrimaryButton>
          {!isNew && (
            <SecondaryButton type="button" disabled={save.isPending} onClick={() => submit(draft.status === 'done' ? 'todo' : 'done')}>
              {draft.status === 'done' ? 'Gjenåpne' : 'Ferdig ✓'}
            </SecondaryButton>
          )}
          <SecondaryButton type="button" onClick={onClose}>
            Avbryt
          </SecondaryButton>

          {!isNew &&
            (confirmDelete ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                Slette oppgaven?
                <button type="button" onClick={handleDelete} disabled={remove.isPending} className="min-h-11 rounded-full bg-ink px-4 text-paper hover:opacity-90">
                  Ja, slett
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-2 text-muted hover:text-ink">
                  Nei
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto min-h-11 px-2 text-sm text-muted hover:text-burgundy">
                Slett
              </button>
            ))}
        </div>
      </form>
    </Modal>
  )
}
