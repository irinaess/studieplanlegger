/**
 * Datatypene i appen. De samme feltene blir til tabeller i Supabase i steg 2.
 */

export interface Subject {
  id: string
  code: string // "MAT111"
  name: string // "Kalkulus"
  color: string // hovedfarge, f.eks. "#72383D"
  weight: number // relativ vekting 1–10; andelen er vekt / sum av alle vekter
  weeklyGoalHours: number
  sortOrder?: number
  archived?: boolean
}

/** Brukerens innstillinger. Klokkeslett lagres som "HH:mm". */
export interface Settings {
  displayName: string
  workMinutes: number
  breakMinutes: number
  lunchMinutes: number
  lunchStart: string
  defaultEndTime: string
  weeklyGoalHours: number
  examModeWeeks: number
  examWeeklyGoalHours: number
  semesterStart: string | null
}

export type TaskType = 'oblig' | 'ovinger' | 'lesing' | 'annet'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Subtask {
  id: string // nye deloppgaver som ikke er lagret ennå har id som starter med "new-"
  title: string
  done: boolean
  sortOrder: number
}

export interface Task {
  id: string
  subjectId: string
  title: string
  type: TaskType
  estimateMinutes: number
  deadline: string | null // ISO-tidspunkt
  starred: boolean
  status: TaskStatus
  moveCount: number // hvor mange ganger oppgaven er flyttet til en annen dag
  notes: string | null
  completedAt: string | null
  subtasks: Subtask[]
}

/** En oppgave som redigeres. Uten id = ny oppgave som ikke er lagret ennå. */
export type TaskDraft = Omit<Task, 'id'> & { id?: string }

/**
 * En hendelse i kalenderen.
 *  - recurring: gjentas hver uke på `weekday` (1 = mandag … 7 = søndag),
 *    eventuelt bare mellom `validFrom` og `validUntil`
 *  - once: gjelder bare på `date`
 * Datoer er "yyyy-MM-dd" og klokkeslett "HH:mm", alltid i norsk tid.
 */
export interface CalendarEvent {
  id: string
  subjectId: string | null
  title: string
  location: string | null
  kind: 'recurring' | 'once'
  weekday: number | null
  date: string | null
  startTime: string
  endTime: string
  validFrom: string | null
  validUntil: string | null
  countsAsStudy: boolean
  source: 'manual' | 'ical'
}

export interface Exam {
  subjectId: string
  date: string // ISO-tidspunkt
  location?: string
}

/** Norske navn på oppgavetypene, til visning. */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  oblig: 'Oblig / innlevering',
  ovinger: 'Øvingsoppgaver',
  lesing: 'Lesing',
  annet: 'Annet',
}

/**
 * En blokk i dagsplanen.
 *  - event:   fast hendelse (forelesning, seminar)
 *  - task:    oppgaveøkt, knyttet til en bestemt oppgave
 *  - subject: fagøkt, godkjent når nok tid er logget i faget
 *  - pause / lunch
 */
export type PlanBlockKind = 'event' | 'task' | 'subject' | 'pause' | 'lunch'

export interface PlanBlock {
  start: string // "10:15"
  end: string
  kind: PlanBlockKind
  id?: string // økt-id fra databasen (bare for økter)
  subjectId?: string
  taskId?: string | null
  title: string
  status?: 'done' | 'partial' | 'skipped' | 'active' | 'planned' | 'past' | 'moved'
}

/** Faktisk tid brukt, fra fokus-timeren eller kveldsinnsjekken. */
export interface TimeLog {
  id: string
  subjectId: string
  taskId: string | null
  sessionId: string | null
  startedAt: string // ISO
  endedAt: string
  minutes: number
  source: 'timer' | 'manual' | 'checkin'
}

export type SessionStatus = 'planned' | 'done' | 'partial' | 'skipped' | 'moved'

/** En lagret økt i dagsplanen. */
export interface DayPlanSession {
  id: string
  kind: 'task' | 'subject' | 'review'
  subjectId: string
  taskId: string | null
  startAt: string // ISO-tidspunkt
  endAt: string
  plannedMinutes: number
  actualMinutes: number | null
  status: SessionStatus
}

/** Dagens plan slik den er lagret: valgene fra morgenen, forklaringen og øktene. */
export interface DayPlan {
  id: string
  date: string
  startTime: string // "HH:mm"
  endTime: string
  energy: 'low' | 'normal' | 'high'
  priority: string
  warnings: string[]
  stoppedAt: string | null
  sessions: DayPlanSession[]
}
