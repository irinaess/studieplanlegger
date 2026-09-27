import { DeadlineStrip } from './components/DeadlineStrip'
import { ExamCountdowns } from './components/ExamCountdowns'
import { Greeting } from './components/Greeting'
import { Header } from './components/Header'
import { TodayCard } from './components/TodayCard'
import { WeekProgress } from './components/WeekProgress'
import { exams, hoursThisWeek, subjects, tasks, weeklyGoalHours } from './data/sample'
import { useNow } from './hooks/useNow'

/** Forsiden. Foreløpig med eksempeldata (steg 1). */
export default function App() {
  const now = useNow()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <Header />

      <main className="mt-10 space-y-12 sm:mt-14">
        <div className="space-y-6">
          <Greeting now={now} name="Iris" />
          <ExamCountdowns exams={exams} subjects={subjects} now={now} />
        </div>

        <DeadlineStrip tasks={tasks} subjects={subjects} now={now} />

        <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <TodayCard />
          <WeekProgress subjects={subjects} hours={hoursThisWeek} goal={weeklyGoalHours} />
        </div>
      </main>
    </div>
  )
}
