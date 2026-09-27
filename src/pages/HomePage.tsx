import { DayPlanCard } from '../components/home/DayPlanCard'
import { DeadlineStrip } from '../components/home/DeadlineStrip'
import { ExamCard } from '../components/home/ExamCard'
import { HeroCard } from '../components/home/HeroCard'
import { WeekRhythmCard } from '../components/home/WeekRhythmCard'
import { Reveal } from '../components/ui/Reveal'
import { useSettings, useSubjects } from '../data/api'
import { dayPriority, sampleFor, semesterStart, streakDays } from '../data/sample'
import { useNow } from '../hooks/useNow'

/**
 * Forsiden. Fag og innstillinger kommer fra Supabase.
 * Oppgaver, eksamener, dagsplan og timer er fortsatt eksempeldata (ekte fra steg 3–7).
 */
export function HomePage() {
  const now = useNow()
  const subjectsQuery = useSubjects()
  const settingsQuery = useSettings()

  if (subjectsQuery.error || settingsQuery.error) {
    return <p className="mt-16 text-center text-sm text-burgundy">Kunne ikke hente data: {(subjectsQuery.error ?? settingsQuery.error)!.message}</p>
  }
  if (!subjectsQuery.data || !settingsQuery.data) return null // laster (tar vanligvis et øyeblikk)

  const subjects = subjectsQuery.data.filter((s) => !s.archived)
  const settings = settingsQuery.data
  const sample = sampleFor(subjects)

  return (
    <div className="space-y-14">
      <Reveal>
        <HeroCard
          now={now}
          name={settings.displayName}
          subjects={subjects}
          exams={sample.exams}
          hours={sample.hoursThisWeek}
          goal={settings.weeklyGoalHours}
          priority={dayPriority}
          streak={streakDays}
        />
      </Reveal>

      <DeadlineStrip tasks={sample.tasks} subjects={subjects} now={now} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Reveal delay={250}>
          <DayPlanCard blocks={sample.dayPlan} subjects={subjects} now={now} />
        </Reveal>
        <div className="space-y-6">
          <Reveal delay={350}>
            <WeekRhythmCard hoursByDay={sample.hoursByDay} subjects={subjects} weeklyGoal={settings.weeklyGoalHours} now={now} />
          </Reveal>
          <Reveal delay={450}>
            <ExamCard exams={sample.exams} subjects={subjects} now={now} semesterStart={settings.semesterStart ?? semesterStart} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
