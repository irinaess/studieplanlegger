import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useSearchParams } from 'react-router'
import { WeekRhythmCard } from '../components/home/WeekRhythmCard'
import { EstimatesCard, StreakCard, WeekGoalCard } from '../components/stats/StatsCards'
import { WeeklyReportCard } from '../components/stats/WeeklyReportCard'
import { useCorrections, useStreak, useWeekStats } from '../hooks/useStudyStats'
import { useNow } from '../hooks/useNow'
import { shiftDate, toDateKey, weekDates } from '../lib/calendar'
import { weekNumber } from '../lib/time'

/** Statistikk for en uke: ukemål, rytme, streak, estimater og ukesrapport. */
export function StatsPage() {
  const now = useNow()
  const today = toDateKey(now)
  const [params, setParams] = useSearchParams()
  const weekStart = weekDates(params.get('uke') ?? today)[0]
  const dates = weekDates(weekStart)
  const isThisWeek = dates.includes(today)

  const stats = useWeekStats(weekStart, today)
  const streak = useStreak(today)
  const { list } = useCorrections()

  return (
    <div className="motion-safe:animate-rise">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Statistikk</h1>
          <p className="mt-1 text-sm text-muted">
            Uke {weekNumber(parseISO(weekStart))} · {format(parseISO(dates[0]), 'd. MMM', { locale: nb })} – {format(parseISO(dates[6]), 'd. MMM yyyy', { locale: nb })}
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-line bg-surface">
          <button type="button" aria-label="Forrige uke" onClick={() => setParams({ uke: shiftDate(weekStart, -7) })} className="flex min-h-10 min-w-10 items-center justify-center text-lg text-muted hover:text-ink">
            ‹
          </button>
          <button type="button" onClick={() => setParams({})} className="min-h-10 px-3 text-sm hover:text-burgundy">
            Denne uken
          </button>
          <button type="button" aria-label="Neste uke" onClick={() => setParams({ uke: shiftDate(weekStart, 7) })} className="flex min-h-10 min-w-10 items-center justify-center text-lg text-muted hover:text-ink">
            ›
          </button>
        </div>
      </div>

      {!stats ? (
        <div className="h-64 rounded-[1.75rem] bg-surface shadow-soft" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <WeekGoalCard report={stats.report} />
            <StreakCard streak={streak.streak} days={streak.days} />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <WeekRhythmCard hoursByDay={stats.byDay} subjects={stats.subjects} weeklyGoal={stats.settings.weeklyGoalHours} now={now} highlightToday={isThisWeek} />
            <EstimatesCard corrections={list} subjects={stats.subjects} />
          </div>
          <div id="rapport">
            <WeeklyReportCard report={stats.report} weekStart={weekStart} title={isThisWeek ? 'Ukesrapport så langt' : 'Ukesrapport'} />
          </div>
        </div>
      )}
    </div>
  )
}
