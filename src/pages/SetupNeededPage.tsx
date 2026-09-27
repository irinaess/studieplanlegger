/** Vises når .env mangler Supabase-nøklene, i stedet for at appen krasjer. */
export function SetupNeededPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-lg rounded-[2rem] bg-surface p-8 shadow-soft sm:p-10">
        <h1 className="font-serif text-3xl">Supabase er ikke koblet til ennå</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Fyll inn <code className="rounded bg-card px-1.5 py-0.5 text-ink">VITE_SUPABASE_URL</code> og{' '}
          <code className="rounded bg-card px-1.5 py-0.5 text-ink">VITE_SUPABASE_PUBLISHABLE_KEY</code> i filen{' '}
          <code className="rounded bg-card px-1.5 py-0.5 text-ink">.env</code> i prosjektmappen, og start appen på nytt med{' '}
          <code className="rounded bg-card px-1.5 py-0.5 text-ink">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}
