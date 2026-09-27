import { formatLongDate, greetingFor, weekNumber } from '../lib/time'

/** Hilsen i skriveskrift, navnet i luftige versaler, og dato + ukenummer. */
export function Greeting({ now, name }: { now: Date; name: string }) {
  return (
    <div>
      <h1 className="font-script text-6xl leading-tight text-burgundy sm:text-7xl">
        {greetingFor(now.getHours())}
      </h1>
      <p className="mt-1 text-xs font-light uppercase tracking-[0.6em] text-ink">{name}</p>
      <p className="mt-5 text-sm text-muted">
        {formatLongDate(now)} <span className="mx-2 text-sand">|</span> Uke {weekNumber(now)}
      </p>
    </div>
  )
}
