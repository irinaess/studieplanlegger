/** Dagens plan. Tom inntil morgenplanleggingen kommer i steg 5. */
export function TodayCard() {
  return (
    <section className="rounded-lg border border-line bg-card p-6 sm:p-8">
      <h2 className="font-serif text-2xl">Dagens plan</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Ingen plan ennå. Fortell når du starter, hvor lenge du kan jobbe og hvordan energien er, så setter appen
        opp dagen i fokusøkter.
      </p>
      <button
        type="button"
        className="mt-6 min-h-11 rounded-full bg-burgundy px-6 text-sm tracking-wide text-paper transition-opacity hover:opacity-90"
      >
        Start dagen
      </button>
    </section>
  )
}
