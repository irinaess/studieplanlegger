import { readableOn } from '../lib/color'
import type { Subject } from '../types'

function formatHours(h: number) {
  return h.toLocaleString('nb-NO', { maximumFractionDigits: 1 })
}

/** Ukemålet med fremdriftslinje, og timer per fag mot fagets mål. */
export function WeekProgress({ subjects, hours, goal }: { subjects: Subject[]; hours: Record<string, number>; goal: number }) {
  const total = Object.values(hours).reduce((sum, h) => sum + h, 0)

  return (
    <section className="rounded-lg border border-line bg-card p-6 sm:p-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">Denne uken</h2>
        <p className="text-sm text-muted tabular">
          <span className="text-ink">{formatHours(total)}</span> av {goal} t
        </p>
      </div>
      <Bar value={total / goal} color="var(--color-burgundy)" />

      <ul className="mt-6 space-y-4">
        {subjects.map((s) => {
          const h = hours[s.id] ?? 0
          return (
            <li key={s.id}>
              <div className="flex justify-between text-sm">
                <span className="tracking-widest" style={{ color: readableOn(s.color) }}>{s.code}</span>
                <span className="text-muted tabular">
                  {formatHours(h)} / {s.weeklyGoalHours} t
                </span>
              </div>
              <Bar value={h / s.weeklyGoalHours} color={s.color} thin />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Bar({ value, color, thin }: { value: number; color: string; thin?: boolean }) {
  return (
    <div className={`mt-2 w-full overflow-hidden rounded-full bg-sand/50 ${thin ? 'h-1' : 'h-1.5'}`}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(1, value) * 100}%`, backgroundColor: color }} />
    </div>
  )
}
