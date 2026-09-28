import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { SubjectExamCard } from '../components/exam/SubjectExamCard'
import { useExams, useSettings, useSubjects, useTopics } from '../data/api'
import { useNow } from '../hooks/useNow'
import { toDateKey } from '../lib/calendar'
import { effectiveWeeklyGoal, examBoost, examMode } from '../lib/exam'
import { daysUntil } from '../lib/time'

/** Eksamen: datoer, nedtelling, temaer, repetisjon og realismesjekk per fag. */
export function ExamPage() {
  const now = useNow()
  const today = toDateKey(now)
  const subjectsQuery = useSubjects()
  const settingsQuery = useSettings()
  const examsQuery = useExams()
  const topicsQuery = useTopics()

  if (!subjectsQuery.data || !settingsQuery.data || !examsQuery.data || !topicsQuery.data) return null
  const settings = settingsQuery.data
  const subjects = subjectsQuery.data.filter((s) => !s.archived)
  const exams = examsQuery.data
  const mode = examMode(exams, settings, today)
  const examFor = (subjectId: string) => exams.find((e) => e.subjectId === subjectId && daysUntil(e.date, now) >= 0) ?? exams.find((e) => e.subjectId === subjectId)

  // Fagets andel av tiden i eksamensperioden: vekting × hvor nær eksamen er.
  const boosted = subjects.map((s) => {
    const exam = examFor(s.id)
    return { id: s.id, value: s.weight * examBoost(exam ? daysUntil(exam.date, now) : null) }
  })
  const total = boosted.reduce((sum, b) => sum + b.value, 0) || 1
  const shareOf = (id: string) => boosted.find((b) => b.id === id)!.value / total

  // Sortert etter eksamensdato, fag uten eksamen sist
  const ordered = [...subjects].sort((a, b) => (examFor(a.id)?.date ?? '9999').localeCompare(examFor(b.id)?.date ?? '9999'))

  return (
    <div className="space-y-6 motion-safe:animate-rise">
      <div>
        <h1 className="font-serif text-4xl">Eksamen</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {mode.active ? (
            <>
              <span className="rounded-full bg-burgundy/10 px-2.5 py-0.5 text-burgundy">Eksamensmodus er på</span> Ukemålet er {effectiveWeeklyGoal(settings, exams, today)} timer, og dagsplanene
              prioriterer repetisjon av temaene under.
            </>
          ) : mode.startsOn ? (
            `Eksamensmodus starter ${format(parseISO(mode.startsOn), 'EEEE d. MMMM', { locale: nb })}, ${settings.examModeWeeks} uker før første eksamen. Da øker ukemålet til ${settings.examWeeklyGoalHours} timer, og planene prioriterer repetisjon.`
          ) : (
            `Legg inn eksamensdatoene, så starter eksamensmodus automatisk ${settings.examModeWeeks} uker før første eksamen.`
          )}
        </p>
      </div>

      {ordered.map((s) => (
        <SubjectExamCard
          key={s.id}
          subject={s}
          exam={examFor(s.id)}
          topics={topicsQuery.data.filter((t) => t.subjectId === s.id)}
          today={today}
          now={now}
          share={shareOf(s.id)}
          weeklyGoal={settings.examWeeklyGoalHours}
          workMinutes={settings.workMinutes}
        />
      ))}
    </div>
  )
}
