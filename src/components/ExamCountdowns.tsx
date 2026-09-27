import { readableOn, withAlpha } from '../lib/color'
import { daysUntil } from '../lib/time'
import type { Exam, Subject } from '../types'

/** Under så mange dager blir nedtellingen mer fremtredende. */
const CLOSE_DAYS = 14

/**
 * Diskret nedtelling til hver eksamen, i fagets farge, f.eks. "MAT111 · 74 dager".
 * Sortert etter hvilken eksamen som kommer først.
 */
export function ExamCountdowns({ exams, subjects, now }: { exams: Exam[]; subjects: Subject[]; now: Date }) {
  const rows = exams
    .map((exam) => ({ exam, subject: subjects.find((s) => s.id === exam.subjectId), days: daysUntil(exam.date, now) }))
    .filter((r) => r.subject && r.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {rows.map(({ exam, subject, days }) => {
        const color = readableOn(subject!.color)
        const close = days < CLOSE_DAYS
        return (
          <li
            key={exam.subjectId}
            title={`Eksamen ${subject!.code} ${new Date(exam.date).toLocaleDateString('nb-NO')}${exam.location ? `, ${exam.location}` : ''}`}
            className={close ? 'rounded-full px-3 py-1' : ''}
            style={{ color, backgroundColor: close ? withAlpha(subject!.color, 0.12) : undefined }}
          >
            <span className="tracking-widest">{subject!.code}</span>
            <span className="mx-2 opacity-50">·</span>
            <span className={`tabular ${close ? 'font-bold' : ''}`}>
              {days === 0 ? 'i dag' : `${days} ${days === 1 ? 'dag' : 'dager'}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
