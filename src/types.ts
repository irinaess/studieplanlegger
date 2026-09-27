/**
 * Datatypene i appen. De samme feltene blir til tabeller i Supabase i steg 2.
 */

export interface Subject {
  id: string
  code: string // "MAT111"
  name: string // "Kalkulus"
  color: string // hovedfarge, f.eks. "#72383D"
  weight: number // andel av studietiden (0–1), brukes av planleggeren
  weeklyGoalHours: number
}

export type TaskType = 'oblig' | 'ovinger' | 'lesing' | 'annet'

export interface Task {
  id: string
  subjectId: string
  title: string
  type: TaskType
  estimateMinutes: number
  deadline?: string // ISO-tidspunkt
  starred: boolean
  subtasksDone?: number
  subtasksTotal?: number
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
  subjectId?: string
  title: string
  status?: 'done' | 'active' | 'planned'
}
