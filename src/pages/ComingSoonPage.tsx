/** Plassholder for sider som bygges i senere steg. */
export function ComingSoonPage({ title, step }: { title: string; step: number }) {
  return (
    <div className="mt-16 text-center motion-safe:animate-rise">
      <h1 className="font-serif text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Kommer i steg {step}.</p>
    </div>
  )
}
