import { NavLink } from 'react-router'

const links = [
  { to: '/', label: 'Oversikt' },
  { to: '/kalender', label: 'Kalender' },
  { to: '/oppgaver', label: 'Oppgaver' },
  { to: '/statistikk', label: 'Statistikk' },
  { to: '/eksamen', label: 'Eksamen' },
  { to: '/innstillinger', label: 'Innstillinger' },
]

/** Toppmeny. NavLink vet selv hvilken side som er aktiv og markerer den i burgunder. */
export function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 motion-safe:animate-fade">
      <NavLink to="/" className="font-serif text-lg tracking-wide">
        Studieplanlegger
      </NavLink>
      <nav className="-mx-3 flex flex-wrap items-center text-sm">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `rounded-full px-3 py-2 transition-colors ${isActive ? 'text-burgundy' : 'text-muted hover:text-ink'}`}
          >
            {link.label}
          </NavLink>
        ))}
        <button type="button" onClick={onSignOut} className="ml-2 rounded-full px-3 py-2 text-muted/70 transition-colors hover:text-ink">
          Logg ut
        </button>
      </nav>
    </header>
  )
}
