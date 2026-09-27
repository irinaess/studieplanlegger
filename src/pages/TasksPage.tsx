import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskEditDialog } from '../components/tasks/TaskEditDialog'
import { PrimaryButton } from '../components/ui/Field'
import { SubjectDot } from '../components/ui/SubjectDot'
import { useSubjects, useTasks } from '../data/api'
import { useNow } from '../hooks/useNow'
import { newTaskDraft, sortTasks } from '../lib/tasks'
import type { Subject, Task } from '../types'

/** Oppgaver: aktive med og uten frist, og ferdige. Filtrer på fag via knappene øverst. */
export function TasksPage() {
  const now = useNow()
  const tasksQuery = useTasks()
  const subjectsQuery = useSubjects()
  const [params, setParams] = useSearchParams()
  const subjectFilter = params.get('fag')
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [showDone, setShowDone] = useState(false)

  const subjects = (subjectsQuery.data ?? []).filter((s) => !s.archived)
  const subjectOf = (id: string) => (subjectsQuery.data ?? []).find((s) => s.id === id)
  const tasks = (tasksQuery.data ?? []).filter((t) => !subjectFilter || t.subjectId === subjectFilter).filter((t) => subjectOf(t.subjectId))

  const active = sortTasks(tasks.filter((t) => t.status !== 'done'))
  const withDeadline = active.filter((t) => t.deadline)
  const withoutDeadline = active.filter((t) => !t.deadline)
  const done = tasks.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const renderList = (list: Task[]) => (
    <ul className="space-y-3">
      {list.map((t, i) => (
        <li key={t.id} className="motion-safe:animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
          <TaskCard task={t} subject={subjectOf(t.subjectId)!} now={now} onOpen={() => setEditing(t)} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="motion-safe:animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Oppgaver</h1>
          <p className="mt-1 text-sm text-muted">
            {active.length} aktive · {done.length} ferdige
          </p>
        </div>
        <PrimaryButton type="button" onClick={() => setEditing('new')} disabled={subjects.length === 0}>
          + Ny oppgave
        </PrimaryButton>
      </div>

      <SubjectFilter subjects={subjects} value={subjectFilter} onChange={(id) => setParams(id ? { fag: id } : {})} />

      {tasksQuery.error && <p className="mt-6 text-sm text-burgundy">Kunne ikke hente oppgaver: {tasksQuery.error.message}</p>}

      {tasksQuery.data && active.length === 0 && (
        <div className="mt-10 rounded-[1.75rem] bg-surface p-8 text-center shadow-soft">
          <p className="font-serif text-2xl">Ingen aktive oppgaver</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Legg inn obliger, øvingsoppgaver og lesing, så bruker appen dem når den setter opp dagsplanen.</p>
        </div>
      )}

      {withDeadline.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted">Med frist</h2>
          {renderList(withDeadline)}
        </section>
      )}
      {withoutDeadline.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted">Uten frist</h2>
          {renderList(withoutDeadline)}
        </section>
      )}
      {done.length > 0 && (
        <section className="mt-10 border-t border-line pt-4">
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone(!showDone)} className="min-h-10 text-sm text-muted hover:text-ink">
            {showDone ? 'Skjul' : 'Vis'} ferdige ({done.length})
          </button>
          {showDone && <div className="mt-3">{renderList(done)}</div>}
        </section>
      )}

      {editing && (
        <TaskEditDialog
          task={editing === 'new' ? undefined : editing}
          initial={editing === 'new' && subjectFilter ? newTaskDraft(subjectFilter) : undefined}
          subjects={subjects}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function SubjectFilter({ subjects, value, onChange }: { subjects: Subject[]; value: string | null; onChange: (id: string | null) => void }) {
  const pill = (active: boolean) => `flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${active ? 'bg-ink text-paper' : 'bg-card text-muted hover:text-ink'}`
  return (
    <div role="radiogroup" aria-label="Filtrer på fag" className="flex flex-wrap gap-2">
      <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(null)} className={pill(!value)}>
        Alle
      </button>
      {subjects.map((s) => (
        <button key={s.id} type="button" role="radio" aria-checked={value === s.id} onClick={() => onChange(s.id)} className={pill(value === s.id)}>
          <SubjectDot subject={s} />
          {s.code}
        </button>
      ))}
    </div>
  )
}
