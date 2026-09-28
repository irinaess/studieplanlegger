/** Fem knapper for trygghet 1–5. Brukes etter en repetisjon og når du legger inn temaer. */
export function ConfidencePicker({ value, onChange, disabled, label = 'Trygghet' }: { value?: number; onChange: (value: number) => void; disabled?: boolean; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} av 5`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`flex size-10 items-center justify-center rounded-full border font-serif text-lg tabular transition-colors disabled:opacity-50 ${
            value === n ? 'border-burgundy bg-burgundy text-paper' : 'border-line bg-surface hover:border-burgundy'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

/** Trygghet vist som fem små prikker (fylt opp til verdien). */
export function ConfidenceDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Trygghet ${value} av 5`} title={`Trygghet ${value} av 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-2 rounded-full ${n <= value ? (value >= 4 ? 'bg-burgundy' : 'bg-taupe') : 'bg-line'}`} />
      ))}
    </span>
  )
}
