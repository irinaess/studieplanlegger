/**
 * Felles data og byggeklosser for de tre designforslagene.
 * Alt her er midlertidig: når et design er valgt, flyttes det som trengs inn i appen.
 */
import { format } from 'date-fns'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { TaskDialog } from '../components/TaskDialog'
import { exams, hoursThisWeek, subjects, tasks, weeklyGoalHours } from '../data/sample'
import { daysUntil, toOslo } from '../lib/time'
import type { Subject } from '../types'

// ---------- Eksempel på en dagsplan (kommer fra algoritmen i steg 5) ----------

export type BlockKind = 'event' | 'task' | 'subject' | 'pause' | 'lunch'
export interface Block {
  start: string // "10:15"
  end: string
  kind: BlockKind
  subjectId?: string
  title: string
  status?: 'done' | 'active' | 'planned'
}

export const dayPlan: Block[] = [
  { start: '08:15', end: '10:00', kind: 'event', subjectId: 'mat111', title: 'Forelesning', status: 'done' },
  { start: '10:15', end: '11:05', kind: 'task', subjectId: 'mat111', title: 'Oblig 3 · oppgave 5', status: 'done' },
  { start: '11:05', end: '11:15', kind: 'pause', title: 'Pause' },
  { start: '11:15', end: '12:05', kind: 'task', subjectId: 'mat111', title: 'Oblig 3 · oppgave 6', status: 'done' },
  { start: '12:05', end: '12:35', kind: 'lunch', title: 'Lunsj' },
  { start: '12:35', end: '13:25', kind: 'subject', subjectId: 'itok101', title: 'Fagøkt', status: 'done' },
  { start: '13:25', end: '13:35', kind: 'pause', title: 'Pause' },
  { start: '13:35', end: '14:25', kind: 'subject', subjectId: 'itok101', title: 'Fagøkt', status: 'active' },
  { start: '14:25', end: '14:35', kind: 'pause', title: 'Pause' },
  { start: '14:35', end: '15:25', kind: 'task', subjectId: 'info132', title: 'Lab 5 · del 2', status: 'planned' },
  { start: '15:25', end: '15:35', kind: 'pause', title: 'Pause' },
  { start: '15:35', end: '16:00', kind: 'subject', subjectId: 'itok101', title: 'Lesing kap. 4', status: 'planned' },
]
/** "Nå" i eksempelet, så tidslinjen viser en økt som pågår. */
export const DEMO_NOW = '13:50'
export const dayPriority =
  'MAT111 har frist i morgen, så dagen startet med Oblig 3 mens energien var høy. ITØK101 får ettermiddagen, fordi faget ligger litt bak ukemålet.'

/** Timer per ukedag (man–søn) og fag denne uken. */
export const hoursByDay: Record<string, number>[] = [
  { mat111: 3, itok101: 3, info132: 1 },
  { mat111: 2.5, itok101: 3.5, info132: 2 },
  { mat111: 3, itok101: 2.5, info132: 0 },
  { mat111: 2, itok101: 2, info132: 3 },
  { mat111: 2, itok101: 2, info132: 0 },
  {},
  {},
]
export const streakDays = 4
export const semesterStart = '2026-08-17'

// ---------- Hjelpefunksjoner ----------

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
export const minutesOf = (b: Block) => toMin(b.end) - toMin(b.start)
export const subjectById = (id?: string) => subjects.find((s) => s.id === id)
export const formatHours = (h: number) => h.toLocaleString('nb-NO', { maximumFractionDigits: 1 })
export const clockTime = (iso: string) => format(toOslo(iso), 'HH:mm')

/** Alt forsiden trenger, ferdig sortert og regnet ut. */
export function homeData(now: Date) {
  const deadlines = tasks
    .filter((t) => t.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
    .map((task) => ({ task, subject: subjectById(task.subjectId)!, days: daysUntil(task.deadline!, now) }))

  const examRows = exams
    .map((exam) => ({ exam, subject: subjectById(exam.subjectId)!, days: daysUntil(exam.date, now) }))
    .sort((a, b) => a.days - b.days)

  const perSubject = subjects.map((subject) => ({
    subject,
    hours: hoursThisWeek[subject.id] ?? 0,
    goal: subject.weeklyGoalHours,
  }))
  const total = perSubject.reduce((sum, s) => sum + s.hours, 0)

  return { deadlines, examRows, perSubject, total, goal: weeklyGoalHours }
}

/** Åpne en oppgave i detaljvinduet. Returnerer en funksjon å kalle, og selve vinduet. */
export function useTaskDialog(now: Date) {
  const [openId, setOpenId] = useState<string | null>(null)
  const task = tasks.find((t) => t.id === openId)
  const dialog = task ? (
    <TaskDialog task={task} subject={subjectById(task.subjectId)!} now={now} onClose={() => setOpenId(null)} />
  ) : null
  return { open: setOpenId, dialog }
}

// ---------- Små byggeklosser ----------

/** Innhold som glir inn, med valgfri forsinkelse (ms) for "trappetrinn"-effekt. */
export function Reveal({ delay = 0, className = '', children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`motion-safe:animate-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/** Tynn fremdriftslinje som fylles fra venstre. */
export function Bar({ value, color, className = 'h-1', track = 'bg-sand/50', delay = 200 }: { value: number; color: string; className?: string; track?: string; delay?: number }) {
  return (
    <div className={`w-full overflow-hidden rounded-full ${track} ${className}`}>
      <div
        className="h-full origin-left rounded-full motion-safe:animate-grow-x"
        style={{ width: `${Math.min(1, value) * 100}%`, backgroundColor: color, animationDelay: `${delay}ms` }}
      />
    </div>
  )
}

/**
 * Fremdriftsring. `pathLength=1` gjør at hele sirkelen har "lengde 1",
 * så fremdrift 0.8 betyr at 80 % av streken tegnes.
 */
export function ProgressRing({
  value,
  size = 160,
  stroke = 8,
  color = 'var(--color-burgundy)',
  track = 'var(--color-card)',
  delay = 300,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  delay?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          className="motion-safe:animate-draw"
          style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, value), animationDelay: `${delay}ms` } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function SubjectDot({ subject, className = 'size-2' }: { subject: Subject; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: subject.color }} />
}
