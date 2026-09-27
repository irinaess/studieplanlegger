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
