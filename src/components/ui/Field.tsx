import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Et skjemafelt med ledetekst over og valgfri hjelpetekst under. */
export function Field({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function PrimaryButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-full bg-burgundy px-6 text-sm tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`min-h-11 rounded-full border border-line px-5 text-sm transition-colors hover:border-taupe disabled:opacity-50 ${className}`}>
      {children}
    </button>
  )
}
