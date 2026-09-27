/**
 * Henting og lagring av data, med TanStack Query.
 *
 * TanStack Query holder en kopi av dataene i minnet (en "cache") under en nøkkel,
 * f.eks. ['subjects']. Alle komponenter som bruker samme nøkkel deler dataene,
 * og etter en lagring ber vi om at nøkkelen hentes på nytt ("invalidate").
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Settings, Subject } from '../types'
import { rowToSettings, rowToSubject, settingsToRow, subjectToRow, type SettingsRow, type SubjectRow } from './mappers'

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
