/**
 * Oversetting mellom databasen og appen.
 *
 * Databasen bruker snake_case (weekly_goal_hours) og lagrer klokkeslett som
 * "11:30:00". Appen bruker camelCase (weeklyGoalHours) og "11:30".
 * Ved å samle oversettingen her, trenger resten av appen aldri å vite
 * hvordan tabellene ser ut.
 */
import type { CalendarEvent, DayPlan, DayPlanSession, Settings, Subject, Subtask, Task, TimeLog } from '../types'

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

export interface EventRow {
  id: string
  subject_id: string | null
  title: string
  location: string | null
  kind: 'recurring' | 'once'
  weekday: number | null
  date: string | null
  start_time: string
  end_time: string
  valid_from: string | null
  valid_until: string | null
  counts_as_study: boolean
  source: 'manual' | 'ical'
}

export function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    location: row.location,
    kind: row.kind,
    weekday: row.weekday,
    date: row.date,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    countsAsStudy: row.counts_as_study,
    source: row.source,
  }
}

/**
 * Feltene vi sender når en hendelse lagres. En fast hendelse har ukedag og ingen
 * dato, en engangshendelse har dato og ingen ukedag eller gyldighetsperiode.
 */
export function eventToRow(e: Omit<CalendarEvent, 'id'>) {
  const recurring = e.kind === 'recurring'
  return {
    subject_id: e.subjectId || null,
    title: e.title.trim(),
    location: e.location?.trim() || null,
    kind: e.kind,
    weekday: recurring ? e.weekday : null,
    date: recurring ? null : e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    valid_from: recurring ? e.validFrom || null : null,
    valid_until: recurring ? e.validUntil || null : null,
    counts_as_study: e.countsAsStudy,
    source: e.source,
  }
}

export interface SubtaskRow {
  id: string
  title: string
  done: boolean
  sort_order: number
}

/** En oppgave med deloppgavene sine (hentet i én spørring med `select('*, subtasks(*)')`). */
export interface TaskRow {
  id: string
  subject_id: string
  title: string
  type: Task['type']
  estimate_minutes: number
  deadline: string | null
  starred: boolean
  status: Task['status']
  move_count: number
  notes: string | null
  completed_at: string | null
  subtasks: SubtaskRow[]
}

export function rowToSubtask(row: SubtaskRow): Subtask {
  return { id: row.id, title: row.title, done: row.done, sortOrder: row.sort_order }
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    type: row.type,
    estimateMinutes: row.estimate_minutes,
    deadline: row.deadline,
    starred: row.starred,
    status: row.status,
    moveCount: row.move_count,
    notes: row.notes,
    completedAt: row.completed_at,
    subtasks: (row.subtasks ?? []).map(rowToSubtask).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

/** Feltene i selve oppgaven (deloppgavene lagres for seg). */
export function taskToRow(t: Omit<Task, 'id' | 'subtasks'>) {
  return {
    subject_id: t.subjectId,
    title: t.title.trim(),
    type: t.type,
    estimate_minutes: Math.max(1, Math.round(t.estimateMinutes)),
    deadline: t.deadline,
    starred: t.starred,
    status: t.status,
    move_count: t.moveCount,
    notes: t.notes?.trim() || null,
    completed_at: t.completedAt,
  }
}

export interface PlanSessionRow {
  id: string
  kind: DayPlanSession['kind']
  subject_id: string
  task_id: string | null
  start_at: string
  end_at: string
  planned_minutes: number
  actual_minutes: number | null
  status: DayPlanSession['status']
}

export interface DayPlanRow {
  id: string
  date: string
  start_time: string
  end_time: string
  energy: DayPlan['energy']
  priority_text: string | null
  stopped_at: string | null
  plan_sessions: PlanSessionRow[]
}

/**
 * "Dagens prioritet" og advarslene lagres i samme tekstfelt: første linje er
 * forklaringen, hver linje etter er en advarsel. Da slipper vi en ekstra kolonne.
 */
export function joinPriority(priority: string, warnings: string[]): string {
  return [priority, ...warnings].join('\n')
}

export function rowToDayPlan(row: DayPlanRow): DayPlan {
  const [priority = '', ...warnings] = (row.priority_text ?? '').split('\n')
  return {
    id: row.id,
    date: row.date,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    energy: row.energy,
    priority,
    warnings: warnings.filter(Boolean),
    stoppedAt: row.stopped_at,
    sessions: (row.plan_sessions ?? [])
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        subjectId: r.subject_id,
        taskId: r.task_id,
        startAt: r.start_at,
        endAt: r.end_at,
        plannedMinutes: r.planned_minutes,
        actualMinutes: r.actual_minutes,
        status: r.status,
      }))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  }
}

export interface TimeLogRow {
  id: string
  subject_id: string
  task_id: string | null
  session_id: string | null
  started_at: string
  ended_at: string
  minutes: number
  source: TimeLog['source']
}

export function rowToTimeLog(r: TimeLogRow): TimeLog {
  return {
    id: r.id,
    subjectId: r.subject_id,
    taskId: r.task_id,
    sessionId: r.session_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    minutes: r.minutes,
    source: r.source,
  }
}
