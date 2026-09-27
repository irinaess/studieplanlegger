/** Tynn fremdriftslinje som fylles fra venstre. `value` er mellom 0 og 1. */
export function Bar({
  value,
  color,
  className = 'h-1',
  delay = 200,
}: {
  value: number
  color: string
  className?: string
  delay?: number
}) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-sand/50 ${className}`}>
      <div
        className="h-full origin-left rounded-full motion-safe:animate-grow-x"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, animationDelay: `${delay}ms` }}
      />
    </div>
  )
}
