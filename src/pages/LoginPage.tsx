import { useState, type FormEvent } from 'react'
import { Field, PrimaryButton } from '../components/ui/Field'
import { inputClass } from '../components/ui/styles'
import { useNow } from '../hooks/useNow'
import { supabase } from '../lib/supabase'
import { greetingFor } from '../lib/time'

/** Gjør Supabase sine engelske feilmeldinger om til norsk. */
function norwegianError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Feil e-post eller passord.'
  if (message.includes('Email not confirmed')) return 'E-postadressen er ikke bekreftet ennå.'
  if (message.toLowerCase().includes('fetch')) return 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.'
  return message
}

/**
 * Innlogging. Det finnes ingen "registrer deg"-knapp: kontoen lages i Supabase,
 * og nye registreringer er skrudd av, så bare du kan logge inn.
 */
export function LoginPage() {
  const now = useNow()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // hindrer at nettleseren laster siden på nytt
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(norwegianError(error.message))
    setBusy(false)
    // Ved suksess oppdager useSession innloggingen, og appen viser forsiden.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-paper to-[#f1ebe3] px-4 py-10">
      <div className="relative w-full max-w-md motion-safe:animate-rise">
        <div aria-hidden className="absolute inset-x-8 -bottom-4 h-full rounded-[2rem] bg-sand/30" />
        <div aria-hidden className="absolute inset-x-4 -bottom-2 h-full rounded-[2rem] bg-card" />

        <form onSubmit={handleSubmit} className="relative rounded-[2rem] bg-surface p-8 shadow-soft sm:p-10">
          <h1 className="font-script text-5xl leading-tight sm:text-6xl">{greetingFor(now.getHours())}</h1>
          <p className="mt-1 text-xs font-light uppercase tracking-[0.6em]">Studieplanlegger</p>

          <div className="mt-8 space-y-4">
            <Field label="E-post">
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Passord">
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-burgundy">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" disabled={busy} className="mt-8 w-full">
            {busy ? 'Logger inn …' : 'Logg inn'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
