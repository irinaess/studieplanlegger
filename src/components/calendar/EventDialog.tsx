import { useState, type FormEvent } from 'react'
import { useDeleteEvent, useSaveEvent, type EventDraft } from '../../data/api'
import { clockToMinutes } from '../../lib/time'
import type { Subject } from '../../types'
import { Field, PrimaryButton, SecondaryButton } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { inputClass } from '../ui/styles'

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']

/**
 * Skjema for å lage eller endre en hendelse.
 * `draft` uten id = ny hendelse. Med id = redigering av en eksisterende.
 */
export function EventDialog({ initial, subjects, onClose }: { initial: EventDraft; subjects: Subject[]; onClose: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const isNew = !initial.id
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft({ ...draft, [key]: value })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (clockToMinutes(draft.endTime) <= clockToMinutes(draft.startTime)) {
      setValidationError('Sluttid må være etter starttid.')
      return
    }
    if (draft.kind === 'recurring' && draft.validFrom && draft.validUntil && draft.validUntil < draft.validFrom) {
      setValidationError('«Til» må være etter «Fra».')
      return
    }
    await save.mutateAsync(draft)
    onClose()
  }

  async function handleDelete() {
    await remove.mutateAsync(initial.id!)
    onClose()
  }

  const error = validationError ?? save.error?.message ?? remove.error?.message

  return (
    <Modal onClose={onClose} label={isNew ? 'Ny hendelse' : 'Rediger hendelse'} width="34rem">
      <form onSubmit={handleSubmit}>
        <h2 className="font-serif text-3xl">{isNew ? 'Ny hendelse' : 'Rediger hendelse'}</h2>

        {/* Fast eller engangs, som to knapper ved siden av hverandre */}
        <div role="radiogroup" aria-label="Type hendelse" className="mt-6 inline-flex rounded-full bg-card p-1 text-sm">
          {(
            [
              ['recurring', 'Fast hver uke'],
              ['once', 'Bare én gang'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={draft.kind === kind}
              onClick={() => set('kind', kind)}
              className={`min-h-10 rounded-full px-4 transition-colors ${draft.kind === kind ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Tittel" className="sm:col-span-2">
            <input required data-autofocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Forelesning" className={inputClass} />
          </Field>

          <Field label="Fag">
            <select
              value={draft.subjectId ?? ''}
              onChange={(e) => setDraft({ ...draft, subjectId: e.target.value || null, countsAsStudy: Boolean(e.target.value) })}
              className={inputClass}
            >
              <option value="">Ingen fag</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </Field>

          {draft.kind === 'recurring' ? (
            <Field label="Ukedag">
              <select value={draft.weekday ?? 1} onChange={(e) => set('weekday', Number(e.target.value))} className={inputClass}>
                {WEEKDAYS.map((day, i) => (
                  <option key={day} value={i + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Dato">
              <input type="date" required value={draft.date ?? ''} onChange={(e) => set('date', e.target.value)} className={`${inputClass} tabular`} />
            </Field>
          )}

          <Field label="Start">
            <input type="time" required step={300} value={draft.startTime} onChange={(e) => set('startTime', e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Slutt">
            <input type="time" required step={300} value={draft.endTime} onChange={(e) => set('endTime', e.target.value)} className={`${inputClass} tabular`} />
          </Field>

          <Field label="Sted" className="sm:col-span-2">
            <input value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="F.eks. Auditorium 2, Realfagbygget" className={inputClass} />
          </Field>

          {draft.kind === 'recurring' && (
            <>
              <Field label="Gjelder fra" hint="Valgfritt">
                <input type="date" value={draft.validFrom ?? ''} onChange={(e) => set('validFrom', e.target.value || null)} className={`${inputClass} tabular`} />
              </Field>
              <Field label="Til og med" hint="Valgfritt, f.eks. siste forelesning">
                <input type="date" value={draft.validUntil ?? ''} onChange={(e) => set('validUntil', e.target.value || null)} className={`${inputClass} tabular`} />
              </Field>
            </>
          )}
        </div>

        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={draft.countsAsStudy} onChange={(e) => set('countsAsStudy', e.target.checked)} className="size-4 accent-burgundy" />
          Teller med i ukemålet
        </label>

        {!isNew && draft.kind === 'recurring' && <p className="mt-2 text-xs text-muted">Endringer gjelder alle uker.</p>}

        {error && (
          <p role="alert" className="mt-4 text-sm text-burgundy">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={save.isPending}>
            {save.isPending ? 'Lagrer …' : 'Lagre'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Avbryt
          </SecondaryButton>

          {!isNew &&
            (confirmDelete ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                Slette{draft.kind === 'recurring' ? ' alle uker' : ''}?
                <button type="button" onClick={handleDelete} disabled={remove.isPending} className="min-h-11 rounded-full bg-ink px-4 text-paper hover:opacity-90">
                  Ja, slett
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-2 text-muted hover:text-ink">
                  Nei
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto min-h-11 px-2 text-sm text-muted hover:text-burgundy">
                Slett
              </button>
            ))}
        </div>
      </form>
    </Modal>
  )
}
