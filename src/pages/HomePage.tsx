import { DeadlineStrip } from '../components/home/DeadlineStrip'
import { ExamCard } from '../components/home/ExamCard'
import { HeroCard } from '../components/home/HeroCard'
import { TodayPlan } from '../components/home/TodayPlan'
import { WeeklyReportCard } from '../components/stats/WeeklyReportCard'
import { WeekRhythmCard } from '../components/home/WeekRhythmCard'
import { Reveal } from '../components/ui/Reveal'
import { useDayPlan, useEvents, useExams, useSettings, useSubjects, useTasks, useTimeLogs, useTopics } from '../data/api'
import { useNow } from '../hooks/useNow'
import { useCorrections, useStreak, useWeekStats } from '../hooks/useStudyStats'
import { isoWeekday, toDateKey, weekDates } from '../lib/calendar'
import { effectiveWeeklyGoal, examMode } from '../lib/exam'
import { hoursByDay, sumByDay } from '../lib/weekHours'

/**
 * Forsiden. Alt kommer fra Supabase. På søndager vises ukesrapporten øverst,
 * og i eksamensmodus gjelder det høyere ukemålet.
 */
export function HomePage() {
  const now = useNow()
  const subjectsQuery = useSubjects()
  const settingsQuery = useSettings()
  const tasksQuery = useTasks()
  const eventsQuery = useEvents()
  const today = toDateKey(now)
  const planQuery = useDayPlan(today)
  const weekStart = weekDates(today)[0]
  const logsQuery = useTimeLogs(weekStart)
  const { streak } = useStreak(today)
  const { factorFor } = useCorrections()
  const isSunday = isoWeekday(today) === 7
  const weekStats = useWeekStats(weekStart, today)
  const examsQuery = useExams()
  const topicsQuery = useTopics()

  if (subjectsQuery.error || settingsQuery.error) {
    return <p className="mt-16 text-center text-sm text-burgundy">Kunne ikke hente data: {(subjectsQuery.error ?? settingsQuery.error)!.message}</p>
  }
  if (!subjectsQuery.data || !settingsQuery.data) return null // laster (tar vanligvis et øyeblikk)

  const subjects = subjectsQuery.data.filter((s) => !s.archived)
  const settings = settingsQuery.data
  const exams = (examsQuery.data ?? []).filter((e) => subjects.some((s) => s.id === e.subjectId))
  const goal = effectiveWeeklyGoal(settings, exams, today)
  const inExamMode = examMode(exams, settings, today).active
  const events = eventsQuery.data ?? []
  const logs = logsQuery.data ?? []
  // Ukens timer: ferdige forelesninger + logget tid
  const byDay = hoursByDay(events, logs, today, now.getHours() * 60 + now.getMinutes())

  return (
    <div className="space-y-14">
      <Reveal>
        <HeroCard
          now={now}
          name={settings.displayName}
          subjects={subjects}
          exams={exams}
          hours={sumByDay(byDay)}
          goal={goal}
          examMode={inExamMode}
          priority={planQuery.data?.priority || 'Start dagen, så forteller appen her hva du bør jobbe med i dag, og hvorfor.'}
          streak={streak}
        />
      </Reveal>

      {/* Søndag: ukesrapporten vises på forsiden */}
      {isSunday && weekStats && (
        <Reveal delay={150}>
          <WeeklyReportCard report={weekStats.report} weekStart={weekStart} title="Ukesrapport" />
        </Reveal>
      )}

      <DeadlineStrip tasks={tasksQuery.data ?? []} subjects={subjects} now={now} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Reveal delay={250}>
          <TodayPlan today={today} now={now} settings={settings} subjects={subjects} events={events} tasks={tasksQuery.data ?? []} logs={logs} correctionFor={factorFor} exams={exams} topics={topicsQuery.data ?? []} />
        </Reveal>
        <div className="space-y-6">
          <Reveal delay={350}>
            <WeekRhythmCard hoursByDay={byDay} subjects={subjects} weeklyGoal={goal} now={now} />
          </Reveal>
          <Reveal delay={450}>
            <ExamCard exams={exams} subjects={subjects} now={now} semesterStart={settings.semesterStart} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
