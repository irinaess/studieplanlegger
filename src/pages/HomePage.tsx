import { DeadlineStrip } from '../components/home/DeadlineStrip'
import { ExamCard } from '../components/home/ExamCard'
import { HeroCard } from '../components/home/HeroCard'
import { TodayPlan } from '../components/home/TodayPlan'
import { WeekRhythmCard } from '../components/home/WeekRhythmCard'
import { Reveal } from '../components/ui/Reveal'
import { useDayPlan, useEvents, useSettings, useSubjects, useTasks, useTimeLogs } from '../data/api'
import { sampleFor, semesterStart, streakDays } from '../data/sample'
import { useNow } from '../hooks/useNow'
import { toDateKey, weekDates } from '../lib/calendar'
import { hoursByDay, sumByDay } from '../lib/weekHours'

/**
 * Forsiden. Alt kommer fra Supabase, bortsett fra eksamener (steg 8) og streak (steg 7),
 * som fortsatt er eksempeldata.
 */
export function HomePage() {
  const now = useNow()
  const subjectsQuery = useSubjects()
  const settingsQuery = useSettings()
  const tasksQuery = useTasks()
  const eventsQuery = useEvents()
  const today = toDateKey(now)
  const planQuery = useDayPlan(today)
  const logsQuery = useTimeLogs(weekDates(today)[0])

  if (subjectsQuery.error || settingsQuery.error) {
    return <p className="mt-16 text-center text-sm text-burgundy">Kunne ikke hente data: {(subjectsQuery.error ?? settingsQuery.error)!.message}</p>
  }
  if (!subjectsQuery.data || !settingsQuery.data) return null // laster (tar vanligvis et øyeblikk)

  const subjects = subjectsQuery.data.filter((s) => !s.archived)
  const settings = settingsQuery.data
  const sample = sampleFor(subjects)
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
          exams={sample.exams}
          hours={sumByDay(byDay)}
          goal={settings.weeklyGoalHours}
          priority={planQuery.data?.priority || 'Start dagen, så forteller appen her hva du bør jobbe med i dag, og hvorfor.'}
          streak={streakDays}
        />
      </Reveal>

      <DeadlineStrip tasks={tasksQuery.data ?? []} subjects={subjects} now={now} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Reveal delay={250}>
          <TodayPlan today={today} now={now} settings={settings} subjects={subjects} events={events} tasks={tasksQuery.data ?? []} logs={logs} />
        </Reveal>
        <div className="space-y-6">
          <Reveal delay={350}>
            <WeekRhythmCard hoursByDay={byDay} subjects={subjects} weeklyGoal={settings.weeklyGoalHours} now={now} />
          </Reveal>
          <Reveal delay={450}>
            <ExamCard exams={sample.exams} subjects={subjects} now={now} semesterStart={settings.semesterStart ?? semesterStart} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
