/**
 * Henting og lagring av data, med TanStack Query.
 *
 * TanStack Query holder en kopi av dataene i minnet (en "cache") under en nøkkel,
 * f.eks. ['subjects']. Alle komponenter som bruker samme nøkkel deler dataene,
 * og etter en lagring ber vi om at nøkkelen hentes på nytt ("invalidate").
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { minutesToClock } from '../lib/calendar'
import type { Energy, PlanOutput } from '../lib/planner/types'
import { diffSubtasks } from '../lib/tasks'
import { osloToIso } from '../lib/time'
import type { CalendarEvent, DayPlan, Settings, Subject, Task, TaskDraft } from '../types'
import {
  eventToRow,
  joinPriority,
  rowToDayPlan,
  rowToEvent,
  rowToSettings,
  rowToSubject,
  rowToTask,
  settingsToRow,
  subjectToRow,
  taskToRow,
  type DayPlanRow,
  type EventRow,
  type SettingsRow,
  type SubjectRow,
  type TaskRow,
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
              start_at: osloToIso(date, minutesToClock(s.start)),
              end_at: osloToIso(date, minutesToClock(s.end)),
              planned_minutes: s.end - s.start,
            })),
          ),
        )
      }
    },
    onSuccess: (_data, args) => queryClient.invalidateQueries({ queryKey: ['dayPlan', args.date] }),
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
      const remaining = plan.sessions.filter((s) => s.status === 'planned' && s.endAt > nowIso)
      if (remaining.length) unwrap(await supabase.from('plan_sessions').update({ status: 'moved' }).in('id', remaining.map((s) => s.id)))

      const movedTaskIds = new Set(remaining.filter((s) => s.kind === 'task' && s.taskId).map((s) => s.taskId!))
      for (const task of tasks.filter((t) => movedTaskIds.has(t.id))) {
        unwrap(await supabase.from('tasks').update({ move_count: task.moveCount + 1 }).eq('id', task.id))
      }
      unwrap(await supabase.from('day_plans').update({ stopped_at: nowIso }).eq('id', plan.id))
    },
    onSuccess: (_data, { plan }) => {
      queryClient.invalidateQueries({ queryKey: ['dayPlan', plan.date] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
