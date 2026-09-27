import { useState, type FormEvent } from 'react'
import { useSaveWeeklyReview, useWeeklyReview, type ReflectionAnswers } from '../../data/api'
import type { WeeklyReport } from '../../lib/weeklyReport'
import { PrimaryButton } from '../ui/Field'
import { inputClass } from '../ui/styles'

/** Ukesrapporten: nøkterne tall og observasjoner, og refleksjonsspørsmål som lagres. */
export function WeeklyReportCard({ report, weekStart, title = 'Ukesrapport' }: { report: WeeklyReport; weekStart: string; title?: string }) {
  const review = useWeeklyReview(weekStart)

  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl">{title}</h2>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Fullførte oppgaver" value={String(report.completedTasks.length)} />
        <Stat label="Økter flyttet / ikke gjort" value={report.plannedSessions ? `${report.missedSessions} av ${report.plannedSessions}` : '–'} />
        <Stat label="Typisk avvik i estimater" value={report.estimateDeviation ? `${Math.round(report.estimateDeviation.typical * 100)} %` : '–'} />
        <Stat label="Streak" value={`${report.streak} ${report.streak === 1 ? 'dag' : 'dager'}`} />
      </dl>

      <ul className="mt-6 space-y-2 border-l border-burgundy pl-5">
        {report.observations.map((o) => (
          <li key={o} className="font-serif text-lg leading-snug">
            {o}
          </li>
        ))}
      </ul>

      {/* Skjemaet vises når svarene er lastet, så feltene fylles ut. key = uken, så det lages nytt når du bytter uke. */}
      {review.isSuccess && <Reflection key={weekStart} report={report} weekStart={weekStart} saved={review.data?.answers ?? {}} />}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1 font-serif text-2xl tabular">{value}</dd>
    </div>
  )
}

function Reflection({ report, weekStart, saved }: { report: WeeklyReport; weekStart: string; saved: ReflectionAnswers }) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(report.questions.map((q) => [q.id, saved[q.id]?.answer ?? ''])))
  const [justSaved, setJustSaved] = useState(false)
  const save = useSaveWeeklyReview()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Spørsmålsteksten lagres sammen med svaret, fordi spørsmålene varierer fra uke til uke.
    const payload: ReflectionAnswers = Object.fromEntries(report.questions.map((q) => [q.id, { question: saved[q.id]?.question ?? q.text, answer: answers[q.id].trim() }]))
    await save.mutateAsync({ weekStart, answers: payload })
    setJustSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 border-t border-line pt-6">
      <h3 className="text-[11px] uppercase tracking-[0.3em] text-muted">Refleksjon</h3>
      <div className="mt-4 space-y-5">
        {report.questions.map((q) => (
          <label key={q.id} className="block">
            <span className="mb-2 block font-serif text-lg italic">{saved[q.id]?.question ?? q.text}</span>
            <textarea
              rows={2}
              value={answers[q.id]}
              onChange={(e) => {
                setAnswers({ ...answers, [q.id]: e.target.value })
                setJustSaved(false)
              }}
              className={`${inputClass} py-2.5`}
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <PrimaryButton type="submit" disabled={save.isPending}>
          {save.isPending ? 'Lagrer …' : 'Lagre refleksjon'}
        </PrimaryButton>
        {justSaved && <span className="text-sm text-muted">Lagret ✓</span>}
        {save.error && <span className="text-sm text-burgundy">Kunne ikke lagre: {save.error.message}</span>}
      </div>
    </form>
  )
}
