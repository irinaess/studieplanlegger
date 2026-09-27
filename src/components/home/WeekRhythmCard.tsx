import { withAlpha } from '../../lib/color'
import { formatHours } from '../../lib/format'
import type { Subject } from '../../types'
import { SubjectDot } from '../ui/SubjectDot'

const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

/**
 * Ukerytme: én søyle per dag (man–søn), stablet per fag,
 * med en stiplet linje for dagsmålet (ukemålet fordelt på fem dager).
 */
export function WeekRhythmCard({ hoursByDay, subjects, weeklyGoal, now }: { hoursByDay: Record<string, number>[]; subjects: Subject[]; weeklyGoal: number; now: Date }) {
  const dailyGoal = weeklyGoal / 5
  const dayTotals = hoursByDay.map((day) => Object.values(day).reduce((a, b) => a + b, 0))
  // Skalaen går litt over det høyeste av dagsmålet og den lengste dagen.
  const max = Math.max(dailyGoal, ...dayTotals) * 1.15
  const today = (now.getDay() + 6) % 7 // getDay: søndag = 0, men uken vår starter mandag

  return (
    <section className="rounded-[1.75rem] bg-card p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl">Ukerytme</h2>

      <div className="relative mt-6 h-44">
        {/* Søyleområdet (over dagnavnene) */}
        <div className="absolute inset-x-0 top-0 bottom-6">
          <div className="absolute inset-x-0 border-t border-dashed border-taupe" style={{ bottom: `${(dailyGoal / max) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-muted">{formatHours(dailyGoal)} t</span>
          </div>
          <div className="grid h-full grid-cols-7 items-end gap-2.5">
            {hoursByDay.map((day, i) => (
              <div
                key={i}
                title={`${DAY_LABELS[i]}: ${formatHours(dayTotals[i])} t`}
                className="mx-auto flex w-full max-w-8 origin-bottom flex-col-reverse overflow-hidden rounded-md motion-safe:animate-grow-y"
                style={{ height: `${(dayTotals[i] / max) * 100}%`, animationDelay: `${500 + i * 70}ms` }}
              >
                {subjects.map((s) =>
                  day[s.id] ? <div key={s.id} style={{ height: `${(day[s.id] / dayTotals[i]) * 100}%`, backgroundColor: withAlpha(s.color, 0.9) }} /> : null,
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 gap-2.5">
          {DAY_LABELS.map((label, i) => (
            <span key={label} className={`text-center text-[11px] ${i === today ? 'font-bold text-burgundy' : 'text-muted'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {subjects.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <SubjectDot subject={s} className="size-1.5" />
            {s.code}
          </li>
        ))}
      </ul>
    </section>
  )
}
