/**
 * Henting og lagring av data, med TanStack Query.
 *
 * TanStack Query holder en kopi av dataene i minnet (en "cache") under en nøkkel,
 * f.eks. ['subjects']. Alle komponenter som bruker samme nøkkel deler dataene,
 * og etter en lagring ber vi om at nøkkelen hentes på nytt ("invalidate").
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { approveSessions } from '../lib/approval'
import { minutesToClock, shiftDate } from '../lib/calendar'
import { checkinChanges, type CheckinRow } from '../lib/checkin'
import type { Energy, PlanOutput } from '../lib/planner/types'
import { diffSubtasks } from '../lib/tasks'
import { osloToIso } from '../lib/time'
import { scheduleNext } from '../lib/exam'
import type { CalendarEvent, DayPlan, Exam, ExamTopic, Settings, Subject, Task, TaskDraft, TimeLog } from '../types'
import {
  eventToRow,
  joinPriority,
  rowToDayPlan,
  rowToEvent,
  rowToExam,
  rowToSettings,
  rowToSubject,
  rowToTask,
  rowToTimeLog,
  rowToTopic,
  settingsToRow,
  subjectToRow,
  taskToRow,
  type DayPlanRow,
  type EventRow,
  type ExamRow,
  type SettingsRow,
  type SubjectRow,
  type TaskRow,
  type TimeLogRow,
  type TopicRow,
} from './mappers'

/** Supabase gir { data, error }. Denne gjør en feil om til et unntak TanStack Query forstår. */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

// ---------- Fag ----------

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const rows = unwrap<SubjectRow[]>(await supabase.from('subjects').select('*').order('sort_order').order('created_at'))
      return rows.map(rowToSubject)
    },
  })
}

/** Lagrer et fag: oppdaterer hvis det har id, ellers opprettes et nytt. */
export function useSaveSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (subject: Subject) => {
      const row = subjectToRow(subject)
      if (subject.id) unwrap(await supabase.from('subjects').update(row).eq('id', subject.id))
      else unwrap(await supabase.from('subjects').insert(row))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

// ---------- Innstillinger ----------

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => rowToSettings(unwrap<SettingsRow>(await supabase.from('settings').select('*').single())),
  })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (settings: Settings) => {
      // upsert = lag raden hvis den mangler, ellers oppdater den
      unwrap(await supabase.from('settings').upsert(settingsToRow(settings)))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })
}

// ---------- Kalenderhendelser ----------

/** Alle hendelser. Det blir ikke mange (et par hundre i et semester), så vi henter alt. */
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => unwrap<EventRow[]>(await supabase.from('events').select('*').order('start_time')).map(rowToEvent),
  })
}

export type EventDraft = Omit<CalendarEvent, 'id'> & { id?: string }

export function useSaveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (event: EventDraft) => {
      const row = eventToRow(event)
      if (event.id) unwrap(await supabase.from('events').update(row).eq('id', event.id))
      else unwrap(await supabase.from('events').insert(row))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('events').delete().eq('id', id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ---------- Oppgaver og deloppgaver ----------

/** Alle oppgaver med deloppgaver. PostgREST henter deloppgavene via fremmednøkkelen task_id. */
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => unwrap<TaskRow[]>(await supabase.from('tasks').select('*, subtasks(*)').order('created_at')).map(rowToTask),
  })
}

/**
 * Lagrer en oppgave og deloppgavene. For deloppgavene sammenligner vi med det som
 * var lagret fra før (`previous`), og lager, oppdaterer eller sletter bare det som er endret.
 */
export function useSaveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ task, previous }: { task: TaskDraft; previous?: Task }) => {
      const row = taskToRow(task)
      let taskId = task.id
      if (taskId) {
        unwrap(await supabase.from('tasks').update(row).eq('id', taskId))
      } else {
        taskId = unwrap<{ id: string }>(await supabase.from('tasks').insert(row).select('id').single()).id
      }

      const diff = diffSubtasks(previous?.subtasks ?? [], task.subtasks)
      if (diff.toDelete.length) unwrap(await supabase.from('subtasks').delete().in('id', diff.toDelete))
      if (diff.toInsert.length)
        unwrap(await supabase.from('subtasks').insert(diff.toInsert.map((s) => ({ task_id: taskId, title: s.title, done: s.done, sort_order: s.sortOrder }))))
      for (const s of diff.toUpdate) unwrap(await supabase.from('subtasks').update({ title: s.title, done: s.done, sort_order: s.sortOrder }).eq('id', s.id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

/** Små raske endringer fra listen: stjerne, ferdig/ikke ferdig. */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Pick<Task, 'starred' | 'status'>> }) => {
      const row: Record<string, unknown> = {}
      if (changes.starred !== undefined) row.starred = changes.starred
      if (changes.status !== undefined) {
        row.status = changes.status
        row.completed_at = changes.status === 'done' ? new Date().toISOString() : null
      }
      unwrap(await supabase.from('tasks').update(row).eq('id', id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useToggleSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      unwrap(await supabase.from('subtasks').update({ done }).eq('id', id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

/** Teller at en oppgave er flyttet til en annen dag. Brukes av dagsplanen (steg 5–6). */
export function useRecordTaskMove() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Task) => {
      unwrap(await supabase.from('tasks').update({ move_count: task.moveCount + 1 }).eq('id', task.id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('tasks').delete().eq('id', id)) // deloppgavene slettes automatisk (on delete cascade)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ---------- Dagsplan ----------

/** Planen for en dato (eller null hvis dagen ikke er startet), med øktene. */
export function useDayPlan(date: string) {
  return useQuery({
    queryKey: ['dayPlan', date],
    queryFn: async () => {
      const row = unwrap<DayPlanRow | null>(await supabase.from('day_plans').select('*, plan_sessions(*)').eq('date', date).maybeSingle())
      return row ? rowToDayPlan(row) : null
    },
  })
}

/**
 * Lagrer en ny plan, eller lager planen på nytt fra et tidspunkt.
 * Ved ny plan midt på dagen beholdes øktene som allerede er over; bare planlagte
 * økter som ikke er ferdige ennå byttes ut.
 */
export function useSaveDayPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { date: string; start: string; end: string; energy: Energy; output: PlanOutput; existing: DayPlan | null; nowIso: string }) => {
      const { date, output, existing } = args
      const priority_text = joinPriority(output.priority, output.warnings)
      let planId = existing?.id

      if (planId) {
        unwrap(await supabase.from('day_plans').update({ end_time: args.end, energy: args.energy, priority_text, stopped_at: null }).eq('id', planId))
        unwrap(await supabase.from('plan_sessions').delete().eq('day_plan_id', planId).eq('status', 'planned').gt('end_at', args.nowIso))
      } else {
        planId = unwrap<{ id: string }>(
          await supabase.from('day_plans').insert({ date, start_time: args.start, end_time: args.end, energy: args.energy, priority_text }).select('id').single(),
        ).id
      }

      if (output.sessions.length) {
        unwrap(
          await supabase.from('plan_sessions').insert(
            output.sessions.map((s) => ({
              day_plan_id: planId,
              kind: s.kind,
              subject_id: s.subjectId,
              task_id: s.taskId,
              topic_id: s.topicId,
              start_at: osloToIso(date, minutesToClock(s.start)),
              end_at: osloToIso(date, minutesToClock(s.end)),
              planned_minutes: s.end - s.start,
            })),
          ),
        )
      }
    },
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ['dayPlan', args.date] })
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] })
    },
  })
}

/**
 * "Jeg må gi meg for i dag": resten av dagens økter markeres som flyttet, og hver
 * oppgave som hadde en oppgaveøkt igjen, får flyttetelleren økt med én.
 * Arbeidet dukker opp igjen i morgendagens plan, fordi planen alltid regnes ut fra det som gjenstår.
 */
export function useStopDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ plan, tasks, nowIso }: { plan: DayPlan; tasks: Task[]; nowIso: string }) => {
      const remaining = plan.sessions.filter((s) => s.status === 'planned' && Date.parse(s.endAt) > Date.parse(nowIso))
      if (remaining.length) unwrap(await supabase.from('plan_sessions').update({ status: 'moved' }).in('id', remaining.map((s) => s.id)))

      const movedTaskIds = new Set(remaining.filter((s) => s.kind === 'task' && s.taskId).map((s) => s.taskId!))
      for (const task of tasks.filter((t) => movedTaskIds.has(t.id))) {
        unwrap(await supabase.from('tasks').update({ move_count: task.moveCount + 1 }).eq('id', task.id))
      }
      unwrap(await supabase.from('day_plans').update({ stopped_at: nowIso }).eq('id', plan.id))
    },
    onSuccess: (_data, { plan }) => {
      queryClient.invalidateQueries({ queryKey: ['dayPlan', plan.date] })
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ---------- Tidslogger, fokus og kveldsinnsjekk ----------

/** Midnatt i norsk tid for en dato, som ISO. */
const dayStartIso = (date: string) => osloToIso(date, '00:00')

async function fetchLogs(fromDate: string, days: number): Promise<TimeLog[]> {
  const rows = unwrap<TimeLogRow[]>(
    await supabase.from('time_logs').select('*').gte('started_at', dayStartIso(fromDate)).lt('started_at', dayStartIso(shiftDate(fromDate, days))).order('started_at'),
  )
  return rows.map(rowToTimeLog)
}

/** Tidslogger for uken som starter på mandagen `weekStart`. */
export function useTimeLogs(weekStart: string) {
  return useQuery({ queryKey: ['timeLogs', weekStart], queryFn: () => fetchLogs(weekStart, 7) })
}

/**
 * Regner dagens økter på nytt ut fra all tid som er logget i dag,
 * og lagrer statusene som er endret (se lib/approval.ts).
 */
async function reapproveDay(date: string) {
  const row = unwrap<DayPlanRow | null>(await supabase.from('day_plans').select('*, plan_sessions(*)').eq('date', date).maybeSingle())
  if (!row) return
  const plan = rowToDayPlan(row)
  const approved = approveSessions(plan.sessions, await fetchLogs(date, 1))
  for (const s of plan.sessions) {
    const next = approved.get(s.id)
    if (next && (next.status !== s.status || next.actualMinutes !== (s.actualMinutes ?? 0))) {
      unwrap(await supabase.from('plan_sessions').update({ status: next.status, actual_minutes: next.actualMinutes }).eq('id', s.id))
    }
  }
}

/** Logger tid fra fokus-timeren, og oppdaterer dagens økter. */
export function useLogFocus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (log: { date: string; subjectId: string; taskId: string | null; sessionId: string | null; startedAt: string; endedAt: string; minutes: number }) => {
      unwrap(
        await supabase.from('time_logs').insert({
          subject_id: log.subjectId,
          task_id: log.taskId,
          session_id: log.sessionId,
          started_at: log.startedAt,
          ended_at: log.endedAt,
          minutes: log.minutes,
          source: 'timer',
        }),
      )
      await reapproveDay(log.date)
    },
    onSuccess: (_d, log) => {
      for (const key of [['timeLogs'], ['dayPlan', log.date], ['dayPlans'], ['estimateData']]) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Har du sjekket inn denne dagen? (notatet og når) */
export function useCheckin(date: string) {
  return useQuery({
    queryKey: ['checkin', date],
    queryFn: async () => unwrap<{ id: string; note: string | null } | null>(await supabase.from('checkins').select('id, note').eq('date', date).maybeSingle()),
  })
}

/**
 * Lagrer kveldsinnsjekken:
 *  1. status og faktisk tid for hver økt
 *  2. ekstra tidslogg for tid timeren ikke fikk med
 *  3. oppgaver markert som ferdige → ferdig; uferdige oppgaver → flyttetelleren økes
 *  4. økter som ikke har startet ennå → flyttet
 *  5. selve innsjekken (med notat)
 */
export function useSaveCheckin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { plan: DayPlan; rows: CheckinRow[]; tasks: Task[]; tasksMarkedDone: Set<string>; note: string; nowIso: string }) => {
      const { plan, rows, tasks, tasksMarkedDone, nowIso } = args
      const changes = checkinChanges(rows, await fetchLogs(plan.date, 1), tasksMarkedDone)

      for (const u of changes.sessionUpdates) {
        unwrap(await supabase.from('plan_sessions').update({ status: u.status, actual_minutes: u.actualMinutes }).eq('id', u.id))
      }
      if (changes.extraLogs.length) {
        unwrap(
          await supabase.from('time_logs').insert(
            changes.extraLogs.map((l) => ({ subject_id: l.subjectId, started_at: nowIso, ended_at: nowIso, minutes: l.minutes, source: 'checkin' })),
          ),
        )
      }
      for (const id of tasksMarkedDone) unwrap(await supabase.from('tasks').update({ status: 'done', completed_at: nowIso }).eq('id', id))
      for (const task of tasks.filter((t) => changes.movedTaskIds.includes(t.id))) {
        unwrap(await supabase.from('tasks').update({ move_count: task.moveCount + 1 }).eq('id', task.id))
      }

      const answered = new Set(rows.map((r) => r.sessionId))
      const future = plan.sessions.filter((s) => s.status === 'planned' && !answered.has(s.id))
      if (future.length) unwrap(await supabase.from('plan_sessions').update({ status: 'moved' }).in('id', future.map((s) => s.id)))
      if (!plan.stoppedAt) unwrap(await supabase.from('day_plans').update({ stopped_at: nowIso }).eq('id', plan.id))

      const existing = unwrap<{ id: string } | null>(await supabase.from('checkins').select('id').eq('date', plan.date).maybeSingle())
      if (existing) unwrap(await supabase.from('checkins').update({ note: args.note.trim() || null }).eq('id', existing.id))
      else unwrap(await supabase.from('checkins').insert({ date: plan.date, note: args.note.trim() || null }))
    },
    onSuccess: (_d, { plan }) => {
      for (const key of [['dayPlan', plan.date], ['dayPlans'], ['checkin', plan.date], ['timeLogs'], ['tasks'], ['estimateData']]) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

// ---------- Statistikk, estimater og ukesrapport ----------

/** Alle dagsplaner mellom to datoer (til streak og ukesrapport). */
export function useDayPlansRange(from: string, to: string) {
  return useQuery({
    queryKey: ['dayPlans', from, to],
    queryFn: async () =>
      unwrap<DayPlanRow[]>(await supabase.from('day_plans').select('*, plan_sessions(*)').gte('date', from).lte('date', to).order('date')).map(rowToDayPlan),
  })
}

/**
 * Faktisk tid per oppgave, til estimatlæringen: tidslogger med oppgave,
 * og minutter fra oppgaveøkter (innsjekk). Henter bare de feltene som trengs.
 */
export function useEstimateData() {
  return useQuery({
    queryKey: ['estimateData'],
    queryFn: async () => {
      const logs = unwrap<{ task_id: string | null; minutes: number }[]>(await supabase.from('time_logs').select('task_id, minutes').not('task_id', 'is', null))
      const sessions = unwrap<{ task_id: string | null; actual_minutes: number | null }[]>(
        await supabase.from('plan_sessions').select('task_id, actual_minutes').eq('kind', 'task').not('actual_minutes', 'is', null),
      )
      return {
        logs: logs.map((l) => ({ taskId: l.task_id, minutes: l.minutes })),
        sessions: sessions.map((s) => ({ taskId: s.task_id, actualMinutes: s.actual_minutes })),
      }
    },
  })
}

export type ReflectionAnswers = Record<string, { question: string; answer: string }>

export function useWeeklyReview(weekStart: string) {
  return useQuery({
    queryKey: ['weeklyReview', weekStart],
    queryFn: async () =>
      unwrap<{ id: string; answers: ReflectionAnswers } | null>(await supabase.from('weekly_reviews').select('id, answers').eq('week_start', weekStart).maybeSingle()),
  })
}

export function useSaveWeeklyReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ weekStart, answers }: { weekStart: string; answers: ReflectionAnswers }) => {
      const existing = unwrap<{ id: string } | null>(await supabase.from('weekly_reviews').select('id').eq('week_start', weekStart).maybeSingle())
      if (existing) unwrap(await supabase.from('weekly_reviews').update({ answers }).eq('id', existing.id))
      else unwrap(await supabase.from('weekly_reviews').insert({ week_start: weekStart, answers }))
    },
    onSuccess: (_d, { weekStart }) => queryClient.invalidateQueries({ queryKey: ['weeklyReview', weekStart] }),
  })
}

// ---------- Eksamener og temaer ----------

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async () => unwrap<ExamRow[]>(await supabase.from('exams').select('*').order('starts_at')).map(rowToExam),
  })
}

export function useSaveExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (exam: Omit<Exam, 'id'> & { id?: string }) => {
      const row = { subject_id: exam.subjectId, starts_at: exam.date, location: exam.location?.trim() || null }
      if (exam.id) unwrap(await supabase.from('exams').update(row).eq('id', exam.id))
      else unwrap(await supabase.from('exams').insert(row))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams'] }),
  })
}

export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('exams').delete().eq('id', id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams'] }),
  })
}

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => unwrap<TopicRow[]>(await supabase.from('exam_topics').select('*').order('sort_order').order('title')).map(rowToTopic),
  })
}

export function useSaveTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (topic: Pick<ExamTopic, 'subjectId' | 'title' | 'confidence' | 'importance'> & { id?: string; sortOrder?: number }) => {
      const row = { subject_id: topic.subjectId, title: topic.title.trim(), confidence: topic.confidence, importance: topic.importance, sort_order: topic.sortOrder ?? 0 }
      if (topic.id) unwrap(await supabase.from('exam_topics').update(row).eq('id', topic.id))
      else unwrap(await supabase.from('exam_topics').insert(row))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  })
}

export function useDeleteTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('exam_topics').delete().eq('id', id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  })
}

/**
 * Etter en repetisjon: lagre ny trygghet, logg repetisjonen, og regn ut når
 * temaet skal repeteres neste gang (spaced repetition, se lib/exam.ts).
 */
export function useRecordReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ topic, confidence, today, examDate }: { topic: ExamTopic; confidence: number; today: string; examDate: string | null }) => {
      const next = scheduleNext(topic.intervalDays, confidence, today, examDate)
      unwrap(await supabase.from('topic_reviews').insert({ topic_id: topic.id, confidence_before: topic.confidence, confidence_after: confidence }))
      unwrap(await supabase.from('exam_topics').update({ confidence, interval_days: next.intervalDays, next_review: next.nextReview }).eq('id', topic.id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  })
}
