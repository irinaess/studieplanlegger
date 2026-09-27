import { DayPlanCard } from './components/home/DayPlanCard'
import { DeadlineStrip } from './components/home/DeadlineStrip'
import { ExamCard } from './components/home/ExamCard'
import { HeroCard } from './components/home/HeroCard'
import { WeekRhythmCard } from './components/home/WeekRhythmCard'
import { Header } from './components/Header'
import { Reveal } from './components/ui/Reveal'
import {
  dayPlan,
  dayPriority,
  exams,
  hoursByDay,
  hoursThisWeek,
  semesterStart,
  streakDays,
  subjects,
  tasks,
  weeklyGoalHours,
} from './data/sample'
import { useNow } from './hooks/useNow'

/** Forsiden. Foreløpig med eksempeldata. Fra steg 2 kommer dataene fra Supabase. */
export default function App() {
  const now = useNow()

  return (
    <div className="min-h-screen bg-linear-to-b from-paper via-paper to-[#f1ebe3]">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-8">
        <Header />

        <main className="mt-8 space-y-14">
          <Reveal>
            <HeroCard
              now={now}
              name="Iris"
              subjects={subjects}
              exams={exams}
              hours={hoursThisWeek}
              goal={weeklyGoalHours}
              priority={dayPriority}
              streak={streakDays}
            />
          </Reveal>

          <DeadlineStrip tasks={tasks} subjects={subjects} now={now} />

          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <Reveal delay={250}>
              <DayPlanCard blocks={dayPlan} subjects={subjects} now={now} />
            </Reveal>
            <div className="space-y-6">
              <Reveal delay={350}>
                <WeekRhythmCard hoursByDay={hoursByDay} subjects={subjects} weeklyGoal={weeklyGoalHours} now={now} />
              </Reveal>
              <Reveal delay={450}>
                <ExamCard exams={exams} subjects={subjects} now={now} semesterStart={semesterStart} />
              </Reveal>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
