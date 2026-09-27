/**
 * Henting og lagring av data, med TanStack Query.
 *
 * TanStack Query holder en kopi av dataene i minnet (en "cache") under en nøkkel,
 * f.eks. ['subjects']. Alle komponenter som bruker samme nøkkel deler dataene,
 * og etter en lagring ber vi om at nøkkelen hentes på nytt ("invalidate").
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { diffSubtasks } from '../lib/tasks'
import type { CalendarEvent, Settings, Subject, Task, TaskDraft } from '../types'
import {
  eventToRow,
  rowToEvent,
  rowToSettings,
  rowToSubject,
  rowToTask,
  settingsToRow,
  subjectToRow,
  taskToRow,
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
