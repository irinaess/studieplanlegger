import { useState, type FormEvent } from 'react'
import { useFocus } from '../focus/FocusContext'
import { Field, PrimaryButton, SecondaryButton } from '../components/ui/Field'
import { ProgressRing } from '../components/ui/ProgressRing'
import { SubjectDot } from '../components/ui/SubjectDot'
import { inputClass } from '../components/ui/styles'
import { ConfidencePicker } from '../components/exam/ConfidencePicker'
import { useDayPlan, useExams, useRecordReview, useSettings, useSubjects, useTasks, useTopics } from '../data/api'
import { sessionTitle } from '../lib/dayPlanView'
import { toDateKey } from '../lib/calendar'
import { readableOn } from '../lib/color'
import { sortTasks } from '../lib/tasks'
import { elapsedMs, formatClock, remainingMs } from '../lib/timer'
import { isAfter, isoToOsloParts, osloNow } from '../lib/time'

/** Fokus: stor nedtelling mens en økt pågår, ellers valg av neste økt. */
export function FocusPage() {
  const focus = useFocus()
  return (
    <div className="space-y-6 motion-safe:animate-rise">
      {focus.pendingReview && <ReviewPrompt />}
      {focus.state ? <RunningTimer /> : <StartFocus />}
    </div>
  )
}

/** Etter en repetisjonsøkt: hvor trygg er du nå? Svaret styrer når temaet kommer igjen. */
function ReviewPrompt() {
  const { pendingReview, clearPendingReview } = useFocus()
  const topics = useTopics()
  const exams = useExams()
  const record = useRecordReview()
  const topic = topics.data?.find((t) => t.id === pendingReview!.topicId)
  if (!topic) return null
  const exam = exams.data?.find((e) => e.subjectId === topic.subjectId && isAfter(e.date, new Date()))

  return (
    <section className="mx-auto max-w-xl rounded-[1.75rem] bg-card p-6 text-center shadow-soft">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Repetisjon ferdig</p>
      <p className="mt-2 font-serif text-2xl">Hvor trygg er du nå på {topic.title.toLowerCase()}?</p>
      <div className="mt-4 flex justify-center">
        <ConfidencePicker
          value={undefined}
          disabled={record.isPending}
          onChange={async (confidence) => {
            await record.mutateAsync({ topic, confidence, today: toDateKey(osloNow()), examDate: exam ? isoToOsloParts(exam.date).date : null })
            clearPendingReview()
          }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">Lav trygghet gir ny repetisjon snart. Høy trygghet gir lengre tid til neste gang.</p>
      <button type="button" onClick={clearPendingReview} className="mt-2 min-h-9 text-xs text-muted hover:text-ink">
        Hopp over
      </button>
    </section>
  )
}

function RunningTimer() {
  const { state, now, pause, resume, addFive, stop } = useFocus()
  const subjects = useSubjects()
  const s = state!
  const subject = subjects.data?.find((x) => x.id === s.subjectId)
  const color = s.phase === 'work' ? (subject?.color ?? '#AC9C8D') : '#D1C7BD'
  const running = s.runningSince !== null
  const progress = Math.min(1, elapsedMs(s, now) / s.targetMs)

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] bg-surface px-6 py-10 text-center shadow-soft sm:py-14">
      <p className="text-[11px] uppercase tracking-[0.35em] text-muted">{s.phase === 'work' ? 'Fokus' : 'Pause'}</p>
      <h1 className="mt-2 font-serif text-3xl">{s.phase === 'work' ? s.title : 'Ta en pause'}</h1>
      {subject && s.phase === 'work' && (
        <p className="mt-1 flex items-center gap-2 text-xs tracking-widest" style={{ color: readableOn(subject.color, '#FFFEFC') }}>
          <SubjectDot subject={subject} />
          {subject.code}
        </p>
      )}

      <div className="mt-8">
        {/* delay={0}: ringen skal følge klokka, ikke animeres inn */}
        <ProgressRing value={progress} size={260} stroke={6} color={color} track="var(--color-card)" delay={0}>
          <span className={`font-serif text-7xl leading-none tabular ${running ? '' : 'opacity-50'}`}>{formatClock(remainingMs(s, now))}</span>
          <span className="mt-2 text-xs text-muted">{running ? (s.phase === 'work' ? 'igjen av økten' : 'igjen av pausen') : 'på pause'}</span>
        </ProgressRing>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <PrimaryButton type="button" onClick={running ? pause : resume}>
          {running ? 'Pause' : 'Fortsett'}
        </PrimaryButton>
        {s.phase === 'work' && (
          <SecondaryButton type="button" onClick={addFive}>
            +5 min
          </SecondaryButton>
        )}
        <SecondaryButton type="button" onClick={stop}>
          {s.phase === 'work' ? 'Avslutt og logg' : 'Hopp over pausen'}
        </SecondaryButton>
      </div>
      {s.phase === 'work' && <p className="mt-4 max-w-xs text-xs text-muted">Tiden logges automatisk på {subject?.code ?? 'faget'} når økten er ferdig, eller når du avslutter.</p>}
    </section>
  )
}

function StartFocus() {
  const { start, notice, dismissNotice } = useFocus()
  const today = toDateKey(osloNow())
  const plan = useDayPlan(today)
  const subjectsQuery = useSubjects()
  const tasksQuery = useTasks()
  const topicsQuery = useTopics()
  const settings = useSettings()
  const subjects = (subjectsQuery.data ?? []).filter((s) => !s.archived)
  const tasks = tasksQuery.data ?? []

  // Økter fra dagens plan som ikke er ferdige og ikke er over
  const upcoming = (plan.data?.sessions ?? []).filter((s) => (s.status === 'planned' || s.status === 'partial') && isAfter(s.endAt, new Date())).slice(0, 4)

  const [subjectId, setSubjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const chosenSubject = subjectId || subjects[0]?.id || ''
  const workMinutes = minutes ?? settings.data?.workMinutes ?? 50
  const subjectTasks = sortTasks(tasks.filter((t) => t.subjectId === chosenSubject && t.status !== 'done'))


  function startFree(e: FormEvent) {
    e.preventDefault()
    const task = tasks.find((t) => t.id === taskId)
    start({ subjectId: chosenSubject, taskId: task?.id ?? null, sessionId: null, title: task?.title ?? 'Fri økt', workMinutes })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-4xl">Fokus</h1>

      {notice && (
        <p className="flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4 text-sm">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Lukk" className="text-muted hover:text-ink">
            ×
          </button>
        </p>
      )}

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-2xl">Fra dagens plan</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Ingen flere økter i planen i dag. Start en fri økt under, eller lag en plan på forsiden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {upcoming.map((s) => {
              const subject = subjects.find((x) => x.id === s.subjectId)
              const title = sessionTitle(s, tasks, topicsQuery.data ?? [])
              return (
                <li key={s.id} className="flex items-center gap-4 py-3">
                  <span className="w-24 shrink-0 text-sm text-muted tabular">
                    {isoToOsloParts(s.startAt).time}–{isoToOsloParts(s.endAt).time}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg">{title}</span>
                    {subject && (
                      <span className="text-xs tracking-wider" style={{ color: readableOn(subject.color, '#FFFEFC') }}>
                        {subject.code}
                        {s.status === 'partial' && ` · ${s.actualMinutes} av ${s.plannedMinutes} min`}
                      </span>
                    )}
                  </span>
                  <SecondaryButton type="button" className="min-h-10 px-4" onClick={() => start({ subjectId: s.subjectId, taskId: s.taskId, sessionId: s.id, topicId: s.topicId, title, workMinutes: s.plannedMinutes - (s.actualMinutes ?? 0) || s.plannedMinutes })}>
                    Start
                  </SecondaryButton>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <form onSubmit={startFree} className="rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-2xl">Fri økt</h2>
        <p className="mt-1 text-sm text-muted">For arbeid utenom planen. Tiden teller på faget, og godkjenner fagets økter i planen.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
          <Field label="Fag">
            <select value={chosenSubject} onChange={(e) => (setSubjectId(e.target.value), setTaskId(''))} className={inputClass}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Oppgave (valgfritt)">
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputClass}>
              <option value="">Ingen bestemt</option>
              {subjectTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minutter">
            <input type="number" min={5} max={180} step={5} value={workMinutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`${inputClass} tabular`} />
          </Field>
        </div>
        <PrimaryButton type="submit" disabled={!chosenSubject} className="mt-6">
          Start fokus
        </PrimaryButton>
      </form>
    </div>
  )
}
