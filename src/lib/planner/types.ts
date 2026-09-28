/**
 * Typene planleggeren jobber med.
 *
 * Alle klokkeslett er minutter etter midnatt (10:15 = 615), fordi det gjør
 * regning med tid enkelt: en økt fra 615 til 665 varer 50 minutter.
 */
import type { TaskType } from '../../types'

export type Energy = 'low' | 'normal' | 'high'

export interface Interval {
  start: number
  end: number
}

export interface PlannerSettings {
  workMinutes: number // f.eks. 50
  breakMinutes: number // f.eks. 10
  lunchStart: number // f.eks. 690 (11:30)
  lunchMinutes: number // f.eks. 30
}

/**
 * En oppgave slik planleggeren ser den: bare det som trengs for å prioritere.
 * I eksamensmodus kan det også være et tema som skal repeteres (kind = 'review').
 */
export interface PlannerTask {
  id: string
  kind?: 'task' | 'review'
  reason?: string // for repetisjon: ferdig begrunnelse til "Dagens prioritet"
  subjectId: string
  title: string
  type: TaskType
  remainingMinutes: number // hvor mye arbeid som gjenstår
  deadlineDays: number | null // dager til fristen (0 = i dag, negativ = gått ut)
  starred: boolean
}

export interface PlannerSubject {
  id: string
  code: string
  weight: number // relativ vekting (1–10)
  weeklyGoalHours: number
  hoursThisWeek: number // timer så langt denne uken
  sortOrder: number
}

export interface PlanInput {
  start: number
  end: number
  energy: Energy
  settings: PlannerSettings
  busy: Interval[] // forelesninger og andre hendelser
  subjects: PlannerSubject[]
  tasks: PlannerTask[]
  weekProgress: number // hvor stor del av arbeidsuken som er gått (0 = mandag morgen, 1 = fredag kveld)
}

export interface PlannedSession extends Interval {
  kind: 'task' | 'subject' | 'review' // oppgaveøkt, fagøkt eller repetisjon
  subjectId: string
  taskId: string | null // for fagøkter: foreslått oppgave (valgfritt)
  topicId: string | null // for repetisjon: temaet
  title: string
}

export interface PlanOutput {
  sessions: PlannedSession[]
  lunch: Interval | null
  priority: string // "Dagens prioritet": kort forklaring
  warnings: string[] // ærlige beskjeder når tiden ikke strekker til
}
