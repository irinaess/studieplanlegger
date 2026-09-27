/**
 * Tid og dato for appen.
 *
 * Appen skal alltid regne i norsk tid (Europe/Oslo), også hvis iPaden
 * eller PC-en står i en annen tidssone. `TZDate` fra @date-fns/tz er en
 * vanlig Date som "later som" den er i en bestemt tidssone, så
 * `getHours()` osv. gir norsk klokkeslett.
 */
import { TZDate } from '@date-fns/tz'
import { differenceInCalendarDays, format, getISOWeek } from 'date-fns'
import { nb } from 'date-fns/locale'

export const TIME_ZONE = 'Europe/Oslo'

/** Nå-tidspunktet i norsk tid. */
export function osloNow(): TZDate {
  return new TZDate(Date.now(), TIME_ZONE)
}

/** Gjør om et hvilket som helst tidspunkt til norsk tid. */
export function toOslo(date: Date | string | number): TZDate {
  return new TZDate(new Date(date).getTime(), TIME_ZONE)
}

/**
 * Hilsen ut fra klokkeslettet (time 0–23).
 *   05–10 God morgen, 10–12 God formiddag, 12–18 God ettermiddag,
 *   18–23 God kveld, 23–05 God natt.
 */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 10) return 'God morgen'
  if (hour >= 10 && hour < 12) return 'God formiddag'
  if (hour >= 12 && hour < 18) return 'God ettermiddag'
  if (hour >= 18 && hour < 23) return 'God kveld'
  return 'God natt'
}

/** F.eks. "Søndag 27. september" (stor forbokstav). */
export function formatLongDate(date: Date): string {
  const text = format(date, 'EEEE d. MMMM', { locale: nb })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** ISO-ukenummer (uken starter mandag), slik det brukes i Norge. */
export function weekNumber(date: Date): number {
  return getISOWeek(date)
}

/** Antall kalenderdager fra `now` til `target` i norsk tid (0 = i dag). */
export function daysUntil(target: Date | string, now: Date): number {
  return differenceInCalendarDays(toOslo(target), toOslo(now))
}

/** Menneskelig tekst for en nedtelling: "i dag", "i morgen", "4 dager igjen" … */
export function countdownText(days: number): string {
  if (days < 0) return days === -1 ? 'gikk ut i går' : `gikk ut for ${-days} dager siden`
  if (days === 0) return 'i dag'
  if (days === 1) return 'i morgen'
  return `${days} dager igjen`
}

/** Kort dato og klokkeslett i norsk tid, f.eks. "fre 2. okt. 23:59". */
export function formatShortDateTime(date: Date | string): string {
  return format(toOslo(date), 'EEE d. MMM HH:mm', { locale: nb })
}
