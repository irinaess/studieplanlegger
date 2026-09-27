import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { readableOn } from '../../lib/color'
import { describeCorrection, MIN_SAMPLES, type Correction } from '../../lib/estimates'
import { formatHours } from '../../lib/format'
import type { DayState } from '../../lib/streak'
import type { WeeklyReport } from '../../lib/weeklyReport'
import type { Subject } from '../../types'
import { Bar } from '../ui/Bar'
import { ProgressRing } from '../ui/ProgressRing'
import { SubjectDot } from '../ui/SubjectDot'

const card = 'rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8'

/** Ukemålet: ring for totalen, linjer per fag. */
export function WeekGoalCard({ report }: { report: WeeklyReport }) {
  return (
    <section className={card}>
      <h2 className="font-serif text-2xl">Ukemål</h2>
      <div className="mt-6 flex flex-wrap items-center gap-8">
        <ProgressRing value={report.goal > 0 ? report.totalHours / report.goal : 0} size={150} stroke={8}>
          <span className="font-serif text-4xl leading-none tabular">{formatHours(report.totalHours)}</span>
          <span className="mt-1 text-xs text-muted">av {report.goal} timer</span>
        </ProgressRing>
        <ul className="min-w-48 flex-1 space-y-4">
          {report.perSubject.map(({ subject, hours, goal }, i) => (
            <li key={subject.id}>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 tracking-wider" style={{ color: readableOn(subject.color, '#FFFEFC') }}>
                  <SubjectDot subject={subject} />
                  {subject.code}
                </span>
                <span className="text-muted tabular">
                  {formatHours(hours)} / {formatHours(goal)} t
                </span>
              </div>
              <Bar value={goal > 0 ? hours / goal : 0} color={subject.color} className="mt-2 h-1" delay={400 + i * 120} />
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-xs text-muted">Forelesninger og seminarer knyttet til et fag teller med, sammen med tiden fra fokus-timeren og innsjekk.</p>
    </section>
  )
}

const DOT: Record<DayState, string> = {
  reached: 'bg-burgundy',
  missed: 'border border-burgundy/50',
  today: 'border border-dashed border-taupe',
  none: 'bg-line',
}
const DOT_LABEL: Record<DayState, string> = { reached: 'dagsplanen nådd', missed: 'ikke nådd', today: 'i dag, pågår', none: 'ingen plan' }

/** Streak: stort tall og prikker for de siste 14 dagene. */
export function StreakCard({ streak, days }: { streak: number; days: { date: string; state: DayState }[] }) {
  return (
    <section className={card}>
      <h2 className="font-serif text-2xl">Streak</h2>
      <p className="mt-4 font-serif leading-none tabular">
        <span className="text-6xl">{streak}</span>
        <span className="ml-2 text-lg text-muted">{streak === 1 ? 'dag' : 'dager'} på rad</span>
      </p>
      <p className="mt-2 text-xs text-muted">En dag teller når du har gjort minst 80 % av dagsplanen. Dager uten plan bryter ikke rekken.</p>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="De siste 14 dagene">
        {days.map((d) => (
          <li key={d.date} title={`${format(parseISO(d.date), 'EEE d. MMM', { locale: nb })}: ${DOT_LABEL[d.state]}`} className="flex flex-col items-center gap-1">
            <span className={`size-4 rounded-full ${DOT[d.state]}`} />
            <span className="text-[9px] text-muted uppercase">{format(parseISO(d.date), 'EEEEE', { locale: nb })}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Hvor treffsikre estimatene dine er, per fag og oppgavetype. */
export function EstimatesCard({ corrections, subjects }: { corrections: Correction[]; subjects: Subject[] }) {
  const sorted = [...corrections].sort((a, b) => b.n - a.n)
  return (
    <section className={card}>
      <h2 className="font-serif text-2xl">Estimater</h2>
      {sorted.length === 0 ? (
        <p className="mt-3 max-w-lg text-sm text-muted">
          Ingen ferdige oppgaver med logget tid ennå. Når du har fullført noen oppgaver med fokus-timeren, viser appen her hvor treffsikre estimatene dine er, og justerer
          planleggingen automatisk (fra {MIN_SAMPLES} oppgaver per fag og type).
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {sorted.map((c) => (
            <li key={`${c.subjectId}:${c.type}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
              <span className="max-w-lg text-sm">{describeCorrection(c, subjects)}</span>
              <span className="text-xs text-muted tabular">{c.factor === 1 ? 'ikke i bruk ennå' : `planlegger med ×${c.factor.toLocaleString('nb-NO', { maximumFractionDigits: 2 })}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
