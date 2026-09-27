const links = ['Oversikt', 'Kalender', 'Oppgaver', 'Statistikk', 'Eksamen', 'Innstillinger']

/** Toppmeny. Sidene kobles på i senere steg, nå er bare "Oversikt" aktiv. */
export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 motion-safe:animate-fade">
      <span className="font-serif text-lg tracking-wide">Studieplanlegger</span>
      <nav className="-mx-3 flex flex-wrap text-sm">
        {links.map((label, i) => (
          <a
            key={label}
            href="#"
            aria-current={i === 0 ? 'page' : undefined}
            className="rounded-full px-3 py-2 text-muted transition-colors hover:text-ink aria-[current=page]:text-burgundy"
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
