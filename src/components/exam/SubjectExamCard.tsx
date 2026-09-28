import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useDeleteTopic, useRecordReview, useSaveTopic } from '../../data/api'
import { useFocus } from '../../focus/FocusContext'
import { readableOn, withAlpha } from '../../lib/color'
import { describeRealism, IMPORTANCE_LABEL, isDue, readiness, realismCheck, sortByPriority } from '../../lib/exam'
import { daysUntil, formatShortDateTime, isoToOsloParts } from '../../lib/time'
import type { Exam, ExamTopic, Importance, Subject } from '../../types'
import { Bar } from '../ui/Bar'
import { SecondaryButton } from '../ui/Field'
import { SubjectDot } from '../ui/SubjectDot'
import { inputClass } from '../ui/styles'
import { ConfidenceDots, ConfidencePicker } from './ConfidencePicker'
import { ExamDialog } from './ExamDialog'

/**
 * Ett fag på eksamenssiden: eksamensdato med nedtelling, hvor klar du er,
 * realismesjekk og temaene sortert etter hva som bør repeteres først.
 */
export function SubjectExamCard({
  subject,
  exam,
  topics,
  today,
  now,
  share,
  weeklyGoal,
  workMinutes,
}: {
  subject: Subject
  exam?: Exam
  topics: ExamTopic[]
  today: string
  now: Date
  share: number // fagets andel av studietiden i eksamensperioden
  weeklyGoal: number
  workMinutes: number
}) {
  const [editingExam, setEditingExam] = useState(false)
  const days = exam ? daysUntil(exam.date, now) : null
  const sorted = sortByPriority(topics, today)
  const ready = readiness(topics)
  const check = exam && days !== null && days >= 0 && topics.length ? realismCheck({ topics, daysLeft: days, weeklyGoal, subjectShare: share, workMinutes, today }) : null
  const color = readableOn(subject.color, '#FFFEFC')

  return (
    <section className="rounded-[1.75rem] bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-widest" style={{ color }}>
            <SubjectDot subject={subject} />
            {subject.code}
          </p>
          <h2 className="mt-1 font-serif text-3xl">{subject.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {exam ? `${formatShortDateTime(exam.date)}${exam.location ? ` · ${exam.location}` : ''}` : 'Ingen eksamensdato ennå'}
            <button type="button" onClick={() => setEditingExam(true)} className="ml-3 text-ink underline-offset-4 hover:underline">
              {exam ? 'Endre' : 'Legg inn eksamen'}
            </button>
          </p>
        </div>
        {days !== null && days >= 0 && (
          <p
            className={`rounded-2xl px-4 py-2 text-right font-serif leading-none tabular ${days < 14 ? '' : 'bg-card'}`}
            style={days < 14 ? { backgroundColor: withAlpha(subject.color, 0.14), color } : undefined}
          >
            <span className="text-4xl">{days}</span>
            <span className="ml-1 text-sm">{days === 1 ? 'dag' : 'dager'}</span>
          </p>
        )}
      </div>

      {topics.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>Klar for eksamen</span>
            <span className="text-muted tabular">
              {topics.filter((t) => t.confidence >= 4).length} av {topics.length} temaer · {Math.round(ready * 100)} %
            </span>
          </div>
          <Bar value={ready} color={subject.color} className="mt-2 h-1.5" />
        </div>
      )}

      {check && <p className={`mt-5 rounded-xl px-4 py-3 text-sm leading-relaxed ${check.enough ? 'bg-card' : 'bg-burgundy/10 text-burgundy'}`}>{describeRealism(check, subject.code)}</p>}

      <ul className="mt-6 divide-y divide-line">
        {sorted.map((t) => (
          <TopicRow key={t.id} topic={t} subject={subject} exam={exam} today={today} workMinutes={workMinutes} />
        ))}
      </ul>

      <AddTopics subjectId={subject.id} nextOrder={topics.length} />

      {editingExam && <ExamDialog subject={subject} exam={exam} onClose={() => setEditingExam(false)} />}
    </section>
  )
}

function TopicRow({ topic, subject, exam, today, workMinutes }: { topic: ExamTopic; subject: Subject; exam?: Exam; today: string; workMinutes: number }) {
  const [rating, setRating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [importance, setImportance] = useState<Importance>(topic.importance)
  const record = useRecordReview()
  const save = useSaveTopic()
  const remove = useDeleteTopic()
  const focus = useFocus()
  const navigate = useNavigate()
  const due = isDue(topic, today)
  const daysToNext = topic.nextReview ? Math.round((Date.parse(topic.nextReview) - Date.parse(today)) / 86_400_000) : 0
  const nextText = topic.nextReview === null ? 'ikke repetert ennå' : due ? 'repeter i dag' : daysToNext === 1 ? 'neste repetisjon i morgen' : `neste repetisjon om ${daysToNext} dager`

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-3 py-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tema" className={`${inputClass} min-h-10 flex-1`} />
        <select value={importance} onChange={(e) => setImportance(e.target.value as Importance)} aria-label="Viktighet" className={`${inputClass} min-h-10 w-auto`}>
          {(['high', 'medium', 'low'] as const).map((i) => (
            <option key={i} value={i}>
              {IMPORTANCE_LABEL[i]} viktighet
            </option>
          ))}
        </select>
        <SecondaryButton type="button" className="min-h-10" onClick={async () => (await save.mutateAsync({ ...topic, title, importance }), setEditing(false))}>
          Lagre
        </SecondaryButton>
        <button type="button" onClick={() => remove.mutate(topic.id)} className="min-h-10 px-2 text-sm text-muted hover:text-burgundy">
          Slett
        </button>
        <button type="button" onClick={() => setEditing(false)} className="min-h-10 px-2 text-sm text-muted">
          Avbryt
        </button>
      </li>
    )
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left" title="Endre tema">
          <span className="block font-serif text-lg leading-snug">{topic.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <ConfidenceDots value={topic.confidence} />
            <span className={topic.importance === 'high' ? 'text-burgundy' : ''}>{IMPORTANCE_LABEL[topic.importance]} viktighet</span>
            <span className={due ? 'text-ink' : ''}>{nextText}</span>
          </span>
        </button>
        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            className="min-h-10 px-4"
            onClick={() => {
              focus.start({ subjectId: subject.id, taskId: null, sessionId: null, topicId: topic.id, title: `Repetisjon · ${topic.title}`, workMinutes })
              navigate('/fokus')
            }}
          >
            Repeter nå
          </SecondaryButton>
          <SecondaryButton type="button" className="min-h-10 px-4" aria-expanded={rating} onClick={() => setRating(!rating)}>
            Ny trygghet
          </SecondaryButton>
        </div>
      </div>
      {rating && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm">
          <span>Hvor trygg er du nå?</span>
          <ConfidencePicker
            value={topic.confidence}
            disabled={record.isPending}
            onChange={async (confidence) => {
              await record.mutateAsync({ topic, confidence, today, examDate: exam ? isoToOsloParts(exam.date).date : null })
              setRating(false)
            }}
          />
        </div>
      )}
    </li>
  )
}

/** Legg til ett eller flere temaer: ett per linje (f.eks. kapitlene fra pensumlista). */
function AddTopics({ subjectId, nextOrder }: { subjectId: string; nextOrder: number }) {
  const [text, setText] = useState('')
  const [importance, setImportance] = useState<Importance>('medium')
  const [confidence, setConfidence] = useState(2)
  const save = useSaveTopic()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const titles = text.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const [i, title] of titles.entries()) await save.mutateAsync({ subjectId, title, importance, confidence, sortOrder: nextOrder + i })
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-dashed border-line p-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-muted">Nye temaer (ett per linje)</span>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Konsumentteori\nProduksjonsteori'} className={`${inputClass} py-2.5`} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          Viktighet
          <select value={importance} onChange={(e) => setImportance(e.target.value as Importance)} className={`${inputClass} min-h-10 w-auto`}>
            {(['high', 'medium', 'low'] as const).map((i) => (
              <option key={i} value={i}>
                {IMPORTANCE_LABEL[i]}
              </option>
            ))}
          </select>
        </label>
        <span className="flex items-center gap-2">
          Trygghet <ConfidencePicker value={confidence} onChange={setConfidence} />
        </span>
        <SecondaryButton type="submit" disabled={!text.trim() || save.isPending} className="ml-auto min-h-10">
          Legg til
        </SecondaryButton>
      </div>
    </form>
  )
}
