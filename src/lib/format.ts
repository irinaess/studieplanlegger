/** Timer med norsk desimalkomma og maks én desimal: 12.5 → "12,5". */
export function formatHours(hours: number): string {
  return hours.toLocaleString('nb-NO', { maximumFractionDigits: 1 })
}
