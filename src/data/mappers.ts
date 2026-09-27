/**
 * Oversetting mellom databasen og appen.
 *
 * Databasen bruker snake_case (weekly_goal_hours) og lagrer klokkeslett som
 * "11:30:00". Appen bruker camelCase (weeklyGoalHours) og "11:30".
 * Ved å samle oversettingen her, trenger resten av appen aldri å vite
 * hvordan tabellene ser ut.
 */
import type { Settings, Subject } from '../types'

export interface SubjectRow {
  id: string
  code: string
  name: string
  color: string
  weight: number
  weekly_goal_hours: number | string // numeric kan komme som tekst
  sort_order: number
  archived: boolean
}

export interface SettingsRow {
  display_name: string
  work_minutes: number
  break_minutes: number
  lunch_minutes: number
  lunch_start: string
  default_end_time: string
  weekly_goal_hours: number | string
  exam_mode_weeks: number
  exam_weekly_goal_hours: number | string
  semester_start: string | null
}

/** "11:30:00" → "11:30" */
const hhmm = (time: string) => time.slice(0, 5)

export function rowToSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    color: row.color,
    weight: row.weight,
    weeklyGoalHours: Number(row.weekly_goal_hours),
    sortOrder: row.sort_order,
    archived: row.archived,
  }
}

/** Feltene vi sender når et fag lagres (id og user_id styres av databasen). */
export function subjectToRow(s: Subject) {
  return {
    code: s.code.trim(),
    name: s.name.trim(),
    color: s.color,
    weight: s.weight,
    weekly_goal_hours: s.weeklyGoalHours,
    sort_order: s.sortOrder ?? 0,
    archived: s.archived ?? false,
  }
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    displayName: row.display_name,
    workMinutes: row.work_minutes,
    breakMinutes: row.break_minutes,
    lunchMinutes: row.lunch_minutes,
    lunchStart: hhmm(row.lunch_start),
    defaultEndTime: hhmm(row.default_end_time),
    weeklyGoalHours: Number(row.weekly_goal_hours),
    examModeWeeks: row.exam_mode_weeks,
    examWeeklyGoalHours: Number(row.exam_weekly_goal_hours),
    semesterStart: row.semester_start,
  }
}

export function settingsToRow(s: Settings): SettingsRow {
  return {
    display_name: s.displayName.trim(),
    work_minutes: s.workMinutes,
    break_minutes: s.breakMinutes,
    lunch_minutes: s.lunchMinutes,
    lunch_start: s.lunchStart,
    default_end_time: s.defaultEndTime,
    weekly_goal_hours: s.weeklyGoalHours,
    exam_mode_weeks: s.examModeWeeks,
    exam_weekly_goal_hours: s.examWeeklyGoalHours,
    semester_start: s.semesterStart || null,
  }
}
