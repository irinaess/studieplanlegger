import { readableOn, withAlpha } from '../../lib/color'
import { formatHours } from '../../lib/format'
import { daysUntil, formatLongDate, greetingFor, weekNumber } from '../../lib/time'
import type { Exam, Subject } from '../../types'
import { ProgressRing } from '../ui/ProgressRing'
import { SubjectDot } from '../ui/SubjectDot'

/**
 * Hovedkortet øverst: hilsen, dato, eksamensnedtelling, dagens prioritet
 * og ukemålet som en fremdriftsring. Kortet ligger på to "papirlag".
 */
export function HeroCard({
  now,
  name,
  subjects,
  exams,
  hours,
  goal,
  priority,
  streak,
}: {
  now: Date
  name: string
  subjects: Subject[]
  exams: Exam[]
  hours: Record<string, number>
  goal: number
  priority: string
  streak: number
}) {
  const total = subjects.reduce((sum, s) => sum + (hours[s.id] ?? 0), 0)
  const examRows = exams
    .map((exam) => ({ exam, subject: subjects.find((s) => s.id === exam.subjectId), days: daysUntil(exam.date, now) }))
    .filter((r) => r.subject && r.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="relative mb-5">
      {/* Papirlagene bak kortet */}
      <div aria-hidden className="absolute inset-x-10 -bottom-5 h-full rounded-[2rem] bg-sand/30" />
      <div aria-hidden className="absolute inset-x-5 -bottom-2.5 h-full rounded-[2rem] bg-card" />

      <div className="relative grid items-center gap-10 rounded-[2rem] bg-surface p-7 shadow-soft sm:p-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-script text-6xl leading-tight sm:text-7xl">{greetingFor(now.getHours())}</h1>
          <p className="mt-1 text-xs font-light uppercase tracking-[0.6em]">{name}</p>
          <p className="mt-5 text-sm text-muted">
            {formatLongDate(now)} <span className="mx-2 text-sand">|</span> Uke {weekNumber(now)}
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {examRows.map(({ exam, subject, days }) => {
              // Under 14 dager igjen: kraftigere farge.
              const close = days < 14
              return (
                <li
                  key={exam.subjectId}
                  title={`Eksamen ${subject!.code}${exam.location ? `, ${exam.location}` : ''}`}
                  className="rounded-full px-3.5 py-1.5 text-xs tracking-wider"
                  style={{
                    backgroundColor: withAlpha(subject!.color, close ? 0.22 : 0.12),
                    color: readableOn(subject!.color),
                  }}
                >
                  {subject!.code} <span className="opacity-50">·</span>{' '}
                  <span className="font-bold tabular">{days === 0 ? 'i dag' : `${days} ${days === 1 ? 'dag' : 'dager'}`}</span>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 max-w-lg border-t border-line pt-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Dagens prioritet</p>
            <p className="mt-2 font-serif text-xl leading-snug italic">{priority}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <ProgressRing value={total / goal} size={176} stroke={9}>
            <span className="font-serif text-5xl leading-none tabular">{formatHours(total)}</span>
            <span className="mt-1 text-xs text-muted">av {goal} timer</span>
          </ProgressRing>
          <div>
            <ul className="space-y-3 text-sm">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <SubjectDot subject={s} />
                  <span className="w-16 tracking-wider" style={{ color: readableOn(s.color) }}>
                    {s.code}
                  </span>
                  <span className="text-muted tabular">
                    {formatHours(hours[s.id] ?? 0)}/{s.weeklyGoalHours}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 inline-block rounded-full bg-card px-3 py-1 text-xs text-muted">
              <span className="text-burgundy">✦</span> {streak} dager på rad
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
