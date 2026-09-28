import { useState, type FormEvent } from 'react'
import { useDeleteExam, useSaveExam } from '../../data/api'
import { isoToOsloParts, osloToIso } from '../../lib/time'
import type { Exam, Subject } from '../../types'
import { Field, PrimaryButton, SecondaryButton } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { inputClass } from '../ui/styles'

/** Legg inn eller endre eksamensdato, klokkeslett og sted for et fag. */
export function ExamDialog({ subject, exam, onClose }: { subject: Subject; exam?: Exam; onClose: () => void }) {
  const initial = exam ? isoToOsloParts(exam.date) : { date: '', time: '09:00' }
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [location, setLocation] = useState(exam?.location ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveExam()
  const remove = useDeleteExam()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({ id: exam?.id, subjectId: subject.id, date: osloToIso(date, time), location })
    onClose()
  }

  return (
    <Modal onClose={onClose} label={`Eksamen ${subject.code}`} width="30rem">
      <form onSubmit={handleSubmit}>
        <h2 className="font-serif text-3xl">Eksamen i {subject.code}</h2>
        <p className="mt-1 text-sm text-muted">{subject.name}</p>
        <div className="mt-6 grid grid-cols-[1fr_7rem] gap-4">
          <Field label="Dato">
            <input type="date" required data-autofocus value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Klokkeslett">
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Sted (valgfritt)" className="col-span-2">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="F.eks. Egget, Studentsenteret" className={inputClass} />
          </Field>
        </div>
        {(save.error || remove.error) && <p className="mt-4 text-sm text-burgundy">Kunne ikke lagre: {(save.error ?? remove.error)!.message}</p>}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={save.isPending}>
            Lagre
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Avbryt
          </SecondaryButton>
          {exam &&
            (confirmDelete ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                Slette eksamen?
                <button type="button" onClick={async () => (await remove.mutateAsync(exam.id), onClose())} className="min-h-11 rounded-full bg-ink px-4 text-paper">
                  Ja, slett
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-2 text-muted">
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
