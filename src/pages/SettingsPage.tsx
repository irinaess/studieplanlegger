import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Field, PrimaryButton, SecondaryButton } from '../components/ui/Field'
import { inputClass } from '../components/ui/styles'
import { useSaveSettings, useSaveSubject, useSettings, useSubjects } from '../data/api'
import { readableOn } from '../lib/color'
import { subjectShares } from '../lib/subjects'
import type { Settings, Subject } from '../types'

/** Innstillinger: fagene (navn, farge, vekting, ukemål) og arbeidsdagen. */
export function SettingsPage() {
  const subjects = useSubjects()
  const settings = useSettings()

  return (
    <div className="space-y-10 motion-safe:animate-rise">
      <h1 className="font-serif text-4xl">Innstillinger</h1>
      {subjects.data && <SubjectsSection subjects={subjects.data} />}
      {settings.data && <SettingsForm initial={settings.data} />}
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

// ---------- Fag ----------

const NEW_SUBJECT: Subject = { id: '', code: '', name: '', color: '#AC9C8D', weight: 3, weeklyGoalHours: 10 }

function SubjectsSection({ subjects }: { subjects: Subject[] }) {
  const [adding, setAdding] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const shares = subjectShares(subjects)
  const active = subjects.filter((s) => !s.archived)
  const archived = subjects.filter((s) => s.archived)
  const goalSum = active.reduce((sum, s) => sum + s.weeklyGoalHours, 0)

  return (
    <Card title="Fag" description="Vektingen bestemmer hvor stor del av studietiden hvert fag får når dagsplanen lages. Arkiverte fag beholder historikken sin, men planlegges ikke.">
      <ul className="space-y-4">
        {active.map((s) => (
          <li key={s.id}>
            <SubjectRow subject={s} share={shares[s.id] ?? 0} />
          </li>
        ))}
        {adding && (
          <li>
            <SubjectRow subject={{ ...NEW_SUBJECT, sortOrder: subjects.length + 1 }} share={0} isNew onDone={() => setAdding(false)} />
          </li>
        )}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {!adding && <SecondaryButton onClick={() => setAdding(true)}>+ Legg til fag</SecondaryButton>}
        <p className="text-xs text-muted tabular">Sum av fagenes ukemål: {goalSum} t</p>
      </div>

      {archived.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button type="button" onClick={() => setShowArchived(!showArchived)} className="text-sm text-muted hover:text-ink">
            {showArchived ? 'Skjul' : 'Vis'} arkiverte fag ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-4 space-y-4">
              {archived.map((s) => (
                <li key={s.id}>
                  <SubjectRow subject={s} share={0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

function SubjectRow({ subject, share, isNew, onDone }: { subject: Subject; share: number; isNew?: boolean; onDone?: () => void }) {
  const [draft, setDraft] = useState(subject)
  const save = useSaveSubject()
  const changed = JSON.stringify(draft) !== JSON.stringify(subject)
  const set = <K extends keyof Subject>(key: K, value: Subject[K]) => setDraft({ ...draft, [key]: value })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync(draft)
    onDone?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[auto_7rem_1fr] lg:grid-cols-[auto_7rem_1fr_12rem_6rem_auto] lg:items-end ${
        subject.archived ? 'border-dashed border-line opacity-70' : 'border-line'
      }`}
      style={{ borderLeft: `4px solid ${draft.color}` }}
    >
      <Field label="Farge">
        <input type="color" value={draft.color} onChange={(e) => set('color', e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1" />
      </Field>
      <Field label="Kode">
        <input required value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="MAT111" className={`${inputClass} tracking-wider`} style={{ color: readableOn(draft.color, '#FFFEFC') }} />
      </Field>
      <Field label="Navn">
        <input required value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Kalkulus" className={inputClass} />
      </Field>
      <Field label={`Vekting · ${Math.round(share * 100)} %`}>
        <input type="range" min={1} max={10} value={draft.weight} onChange={(e) => set('weight', Number(e.target.value))} className="h-11 w-full accent-burgundy" />
      </Field>
      <Field label="Ukemål (t)">
        <input type="number" min={0} max={80} step={0.5} required value={draft.weeklyGoalHours} onChange={(e) => set('weeklyGoalHours', Number(e.target.value))} className={`${inputClass} tabular`} />
      </Field>

      <div className="flex flex-wrap gap-2 sm:col-span-full lg:col-span-1">
        {(changed || isNew) && <PrimaryButton type="submit" disabled={save.isPending}>{save.isPending ? 'Lagrer …' : 'Lagre'}</PrimaryButton>}
        {isNew && <SecondaryButton type="button" onClick={onDone}>Avbryt</SecondaryButton>}
        {!isNew && !changed && (
          <SecondaryButton type="button" disabled={save.isPending} onClick={() => save.mutate({ ...subject, archived: !subject.archived })}>
            {subject.archived ? 'Gjenopprett' : 'Arkiver'}
          </SecondaryButton>
        )}
      </div>
      {save.error && <p className="text-sm text-burgundy sm:col-span-full">Kunne ikke lagre: {save.error.message}</p>}
    </form>
  )
}

// ---------- Arbeidsdag og mål ----------

function SettingsForm({ initial }: { initial: Settings }) {
  const [draft, setDraft] = useState(initial)
  const save = useSaveSettings()
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft({ ...draft, [key]: value })
    setSaved(false)
  }
  type NumberKey = 'lunchMinutes' | 'weeklyGoalHours' | 'examModeWeeks' | 'examWeeklyGoalHours'
  const num = (key: NumberKey) => (e: ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync(draft)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card title="Arbeidsdagen" description="Brukes når appen setter opp dagsplanen om morgenen.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Navn i hilsenen">
            <input required value={draft.displayName} onChange={(e) => set('displayName', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Pomodoro (jobb / pause)">
            <select
              value={`${draft.workMinutes}/${draft.breakMinutes}`}
              onChange={(e) => {
                const [work, rest] = e.target.value.split('/').map(Number)
                setDraft({ ...draft, workMinutes: work, breakMinutes: rest })
                setSaved(false)
              }}
              className={inputClass}
            >
              <option value="50/10">50 min / 10 min</option>
              <option value="45/10">45 min / 10 min</option>
              <option value="25/5">25 min / 5 min</option>
            </select>
          </Field>
          <Field label="Standard sluttid" hint="Du kan velge en annen hver morgen.">
            <input type="time" required value={draft.defaultEndTime} onChange={(e) => set('defaultEndTime', e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Lunsj starter rundt">
            <input type="time" required value={draft.lunchStart} onChange={(e) => set('lunchStart', e.target.value)} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Lunsjpause (min)">
            <input type="number" min={0} max={120} step={5} required value={draft.lunchMinutes} onChange={num('lunchMinutes')} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Semesterstart" hint="Brukes til fremdriftslinjene mot eksamen.">
            <input type="date" value={draft.semesterStart ?? ''} onChange={(e) => set('semesterStart', e.target.value || null)} className={`${inputClass} tabular`} />
          </Field>
        </div>
      </Card>

      <Card title="Mål" description="Ukemålet inkluderer forelesninger og seminarer som er knyttet til et fag.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Ukemål (t)">
            <input type="number" min={0} max={100} step={0.5} required value={draft.weeklyGoalHours} onChange={num('weeklyGoalHours')} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Eksamensmodus starter" hint="Antall uker før første eksamen.">
            <input type="number" min={0} max={12} required value={draft.examModeWeeks} onChange={num('examModeWeeks')} className={`${inputClass} tabular`} />
          </Field>
          <Field label="Ukemål i eksamensmodus (t)">
            <input type="number" min={0} max={100} step={0.5} required value={draft.examWeeklyGoalHours} onChange={num('examWeeklyGoalHours')} className={`${inputClass} tabular`} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <PrimaryButton type="submit" disabled={save.isPending}>
          {save.isPending ? 'Lagrer …' : 'Lagre innstillinger'}
        </PrimaryButton>
        {saved && <span className="text-sm text-muted">Lagret ✓</span>}
        {save.error && <span className="text-sm text-burgundy">Kunne ikke lagre: {save.error.message}</span>}
      </div>
    </form>
  )
}
