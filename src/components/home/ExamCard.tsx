import { Link } from 'react-router'
import { shiftDate } from '../../lib/calendar'
import { readableOn } from '../../lib/color'
import { daysUntil, formatShortDateTime, isoToOsloParts, toOslo } from '../../lib/time'
import type { Exam, Subject } from '../../types'
import { Bar } from '../ui/Bar'
import { SubjectDot } from '../ui/SubjectDot'

/**
 * Eksamenene med nedtelling. Linjen under viser hvor langt vi har kommet
 * fra semesterstart frem mot eksamen (full linje = eksamensdagen).
 */
export function ExamCard({ exams, subjects, now, semesterStart }: { exams: Exam[]; subjects: Subject[]; now: Date; semesterStart: string | null }) {
  const rows = exams
    .map((exam) => ({ exam, subject: subjects.find((s) => s.id === exam.subjectId)!, days: daysUntil(exam.date, now) }))
    .filter((r) => r.subject && r.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl">Eksamen</h2>
      {rows.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          Ingen eksamensdatoer ennå.{' '}
          <Link to="/eksamen" className="text-ink underline-offset-4 hover:underline">
            Legg dem inn
          </Link>
        </p>
      )}
      <ul className="mt-5 space-y-5">
        {rows.map(({ exam, subject, days }, i) => {
          // Uten semesterstart i innstillingene regner vi med ca. 16 uker før eksamen.
          const start = toOslo(semesterStart ?? shiftDate(isoToOsloParts(exam.date).date, -112)).getTime()
          const elapsed = (now.getTime() - start) / (toOslo(exam.date).getTime() - start)
          return (
            <li key={exam.id}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="flex min-w-0 items-center gap-2">
                  <SubjectDot subject={subject} />
                  <span className="text-sm tracking-wider" style={{ color: readableOn(subject.color) }}>
                    {subject.code}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {formatShortDateTime(exam.date)}
                    {exam.location && ` · ${exam.location}`}
                  </span>
                </span>
                <span className="font-serif text-3xl whitespace-nowrap tabular">
                  {days}
                  <span className="ml-1 text-sm text-muted">{days === 1 ? 'dag' : 'dager'}</span>
                </span>
              </div>
              <Bar value={elapsed} color={subject.color} className="mt-2 h-1" delay={600 + i * 150} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
