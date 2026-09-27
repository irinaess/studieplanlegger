/**
 * Design 3: "Urverk"
 * Tid som fysiske objekter: dagen er en urskive der øktene ligger som buer rundt
 * klokka, semesteret er en horisont frem mot eksamen (med eksamensmodus markert),
 * og uka er en rytme av søyler. Innholdsfortegnelse-linjer (·····) til eksamen.
 */
import { addDays, differenceInCalendarDays, startOfISOWeek } from 'date-fns'
import { useNow } from '../hooks/useNow'
import { readableOn, withAlpha } from '../lib/color'
import { countdownText, formatLongDate, formatShortDateTime, greetingFor, toOslo, weekNumber } from '../lib/time'
import { Bar, DEMO_NOW, Reveal, SubjectDot, dayPlan, dayPriority, formatHours, homeData, hoursByDay, minutesOf, streakDays, subjectById, toMin, useTaskDialog, type Block } from './shared'
import { subjects } from '../data/sample'

const NEAR_DAYS = 3

export function UrverkHome() {
  const now = useNow()
  const { deadlines, examRows, total, goal } = homeData(now)
  const { open, dialog } = useTaskDialog(now)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-8">
        <header className="flex items-baseline justify-between border-b border-line pb-4 motion-safe:animate-fade">
          <span className="font-serif text-lg tracking-wide">Studieplanlegger</span>
          <span className="text-xs text-muted tabular">
            {formatLongDate(now)} · Uke {weekNumber(now)}
          </span>
        </header>

        {/* Frister med liten bue som viser hvor nær fristen er (full bue = 14 dager eller mer) */}
        <ol className="-mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3">
          {deadlines.map(({ task, subject, days }, i) => {
            const near = days < NEAR_DAYS
            return (
              <li key={task.id} className="shrink-0 snap-start motion-safe:animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
                <button
                  type="button"
                  onClick={() => open(task.id)}
                  className={`flex w-64 items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgba(50,45,41,0.3)] focus-visible:outline-2 focus-visible:outline-burgundy ${
                    near ? 'border-burgundy' : 'border-line hover:border-taupe'
                  }`}
                >
                  <CountdownArc days={days} color={near ? 'var(--color-burgundy)' : subject.color} delay={300 + i * 80} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11px] tracking-widest" style={{ color: readableOn(subject.color) }}>
                      <SubjectDot subject={subject} className="size-1.5" />
                      {subject.code}
                      {task.starred && <span className="text-burgundy">★</span>}
                    </span>
                    <span className="block font-serif text-lg leading-snug">{task.title}</span>
                    <span className={`block text-xs ${near ? 'font-bold text-burgundy' : 'text-muted'}`}>{countdownText(days)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {/* Hilsen + urskive */}
        <section className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <Reveal>
            <h1 className="font-script text-7xl leading-[1] sm:text-8xl">{greetingFor(now.getHours())}</h1>
            <p className="mt-3 text-xs font-light uppercase tracking-[0.6em]">Iris</p>

            <div className="mt-10 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Dagens prioritet</p>
              <p className="mt-2 font-serif text-xl leading-snug italic">{dayPriority}</p>
            </div>

            {/* Eksamen som en innholdsfortegnelse med prikkede linjer */}
            <ul className="mt-10 max-w-md space-y-2.5">
              {examRows.map(({ exam, subject, days }) => (
                <li key={exam.subjectId} className="flex items-baseline gap-3" title={formatShortDateTime(exam.date)}>
                  <span className="text-sm tracking-[0.2em]" style={{ color: readableOn(subject.color) }}>
                    {subject.code}
                  </span>
                  <span className="flex-1 -translate-y-1 border-b border-dotted border-taupe" />
                  <span className="font-serif text-2xl tabular">{days}</span>
                  <span className="w-10 text-xs text-muted">dager</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150} className="mx-auto">
            <div className="rounded-[2.5rem] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_20px_40px_-24px_rgba(50,45,41,0.35)] sm:p-7">
              <DayDial blocks={dayPlan} now={DEMO_NOW} />
            </div>
          </Reveal>
        </section>

        {/* Semesterhorisont */}
        <Reveal delay={250} className="mt-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Semesterhorisont</p>
          <SemesterHorizon now={now} deadlines={deadlines} exams={examRows} />
        </Reveal>

        {/* Ukerytme */}
        <Reveal delay={350} className="mt-14 grid gap-8 rounded-[2rem] border border-line bg-surface p-6 sm:p-8 md:grid-cols-[1fr_16rem]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Ukerytme</p>
            <WeekRhythm now={now} />
          </div>
          <div className="flex flex-col justify-center md:border-l md:border-line md:pl-8">
            <p className="font-serif leading-none tabular">
              <span className="text-6xl">{formatHours(total)}</span>
              <span className="ml-2 text-xl text-muted">/ {goal} t</span>
            </p>
            <Bar value={total / goal} color="var(--color-burgundy)" className="mt-4 h-1" />
            <ul className="mt-5 space-y-1.5 text-sm">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <SubjectDot subject={s} />
                  <span className="flex-1" style={{ color: readableOn(s.color) }}>
                    {s.code}
                  </span>
                  <span className="text-muted tabular">{formatHours(hoursByDay.reduce((sum, d) => sum + (d[s.id] ?? 0), 0))} t</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted">
              <span className="font-serif text-lg text-ink">{streakDays}</span> dager på rad med nådd dagsplan
            </p>
          </div>
        </Reveal>
      </div>
      {dialog}
    </div>
  )
}

/** Liten bue rundt antall dager. Full bue = 14 dager eller mer igjen. */
function CountdownArc({ days, color, delay }: { days: number; color: string; delay: number }) {
  const size = 48
  const r = 21
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={24} cy={24} r={r} fill="none" stroke="var(--color-line)" strokeWidth={1.5} />
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={1}
          className="motion-safe:animate-draw"
          style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, Math.max(days, 0.5) / 14), animationDelay: `${delay}ms` }}
        />
      </svg>
      <span className="font-serif text-xl tabular">{days}</span>
    </span>
  )
}

/**
 * Urskive med 12 timer. Hver økt tegnes som en bue fra start- til sluttid.
 * Vinkel: kl. 12 er rett opp, og én time er 30 grader.
 */
function DayDial({ blocks, now }: { blocks: Block[]; now: string }) {
  const SIZE = 320
  const C = SIZE / 2
  const ARC_R = 118

  const angle = (min: number) => (((min / 60) % 12) / 12) * 360 - 90
  const point = (deg: number, r: number) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)]
  const arc = (a: number, b: number, r: number) => {
    const [x1, y1] = point(angle(a), r)
    const [x2, y2] = point(angle(b), r)
    const large = b - a > 360 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const nowMin = toMin(now)
  const [hx, hy] = point(angle(nowMin), ARC_R + 22)
  const current = blocks.find((b) => b.status === 'active')
  const currentSubject = subjectById(current?.subjectId)
  const minutesLeft = current ? toMin(current.end) - nowMin : 0
  const roman = ['XII', 'III', 'VI', 'IX']

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[min(78vw,320px)]" role="img" aria-label="Dagens økter vist som en urskive">
      {/* Ring og fine sirkler, som en urskive */}
      <circle cx={C} cy={C} r={150} fill="var(--color-surface)" stroke="var(--color-line)" />
      <circle cx={C} cy={C} r={ARC_R} fill="none" stroke="var(--color-line)" strokeOpacity={0.6} strokeWidth={12} />
      <circle cx={C} cy={C} r={92} fill="none" stroke="var(--color-line)" strokeOpacity={0.5} />

      {/* Minuttstreker og timestreker */}
      {Array.from({ length: 60 }, (_, i) => {
        const deg = i * 6 - 90
        const long = i % 5 === 0
        const [x1, y1] = point(deg, 146)
        const [x2, y2] = point(deg, long ? 136 : 142)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={long ? 'var(--color-ink)' : 'var(--color-taupe)'} strokeWidth={long ? 1.2 : 0.6} />
      })}
      {roman.map((r, i) => {
        const [x, y] = point(i * 90 - 90, 78)
        return (
          <text key={r} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-muted font-serif" fontSize={13}>
            {r}
          </text>
        )
      })}

      {/* Øktene som buer */}
      {blocks.map((b, i) => {
        if (b.kind === 'pause') return null
        const s = subjectById(b.subjectId)
        const a = toMin(b.start) + 2
        const e = toMin(b.end) - 2
        const color = b.kind === 'lunch' ? 'var(--color-sand)' : s!.color
        const opacity = b.kind === 'event' ? 0.35 : b.status === 'done' ? 0.55 : 1
        return (
          <path
            key={i}
            d={arc(a, e, ARC_R)}
            fill="none"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={b.status === 'active' ? 16 : 12}
            strokeLinecap="butt"
            pathLength={1}
            className="motion-safe:animate-draw"
            style={{ strokeDasharray: 1, strokeDashoffset: 0, animationDelay: `${300 + i * 90}ms` }}
          >
            <title>
              {b.start}–{b.end} {b.title}
            </title>
          </path>
        )
      })}

      {/* Viser for nå */}
      <g className="motion-safe:animate-fade" style={{ animationDelay: '1200ms' }}>
        <line x1={C} y1={C} x2={hx} y2={hy} stroke="var(--color-burgundy)" strokeWidth={1.2} />
        <circle cx={C} cy={C} r={3.5} fill="var(--color-burgundy)" />
      </g>

      {/* Midten: hva som skjer nå */}
      {current && currentSubject && (
        <g className="motion-safe:animate-fade" style={{ animationDelay: '900ms' }}>
          <text x={C} y={C - 30} textAnchor="middle" className="fill-muted" fontSize={9} letterSpacing={3}>
            NÅ · {now}
          </text>
          <text x={C} y={C + 28} textAnchor="middle" className="fill-ink font-serif" fontSize={20}>
            {current.title}
          </text>
          <text x={C} y={C + 46} textAnchor="middle" fontSize={10} letterSpacing={1.5} fill={readableOn(currentSubject.color, '#FFFEFC')}>
            {currentSubject.code} · {minutesLeft} min igjen av {minutesOf(current)}
          </text>
        </g>
      )}
    </svg>
  )
}

type DeadlineRow = ReturnType<typeof homeData>['deadlines'][number]
type ExamRow = ReturnType<typeof homeData>['examRows'][number]

/**
 * Horisontal linje fra i dag til siste eksamen. Uker som små streker,
 * frister som prikker over linjen, eksamener som markører under,
 * og eksamensmodus (4 uker før første eksamen) som et svakt felt.
 */
function SemesterHorizon({ now, deadlines, exams }: { now: Date; deadlines: DeadlineRow[]; exams: ExamRow[] }) {
  const lastExam = Math.max(...exams.map((e) => e.days))
  const span = lastExam + 4
  const pct = (days: number) => `${(days / span) * 100}%`

  const firstMonday = addDays(startOfISOWeek(now), 7)
  const weeks = []
  for (let d = firstMonday; differenceInCalendarDays(d, now) < span; d = addDays(d, 7)) {
    weeks.push({ days: differenceInCalendarDays(d, now), week: weekNumber(d) })
  }
  const examModeStart = Math.min(...exams.map((e) => e.days)) - 28

  return (
    <div className="relative mt-6 h-36">
      {/* Eksamensmodus-feltet */}
      <div
        className="absolute top-0 bottom-6 origin-left rounded-lg bg-burgundy/[0.06] motion-safe:animate-grow-x"
        style={{ left: pct(examModeStart), right: `${100 - (lastExam / span) * 100}%`, animationDelay: '700ms' }}
      >
        <span className="absolute top-2 left-3 text-[10px] tracking-[0.3em] text-burgundy uppercase">Eksamensmodus</span>
      </div>

      {/* Selve linjen */}
      <div className="absolute top-[62px] right-0 left-0 h-px origin-left bg-ink/70 motion-safe:animate-grow-x" style={{ animationDelay: '400ms' }} />
      <div className="absolute top-[58px] left-0 size-2 rounded-full bg-ink" />
      <span className="absolute top-[74px] left-0 text-[10px] tracking-[0.2em] text-ink uppercase">I dag</span>

      {weeks.map(({ days, week }, i) => (
        <div key={week} className="absolute top-[58px] h-2 w-px bg-taupe" style={{ left: pct(days) }}>
          {/* Ingen ukenummer helt inntil "I dag", så de ikke kolliderer */}
          {days > span * 0.04 && <span className={`absolute top-4 -translate-x-1/2 text-[10px] text-muted tabular ${i % 2 ? 'hidden sm:block' : ''}`}>{week}</span>}
        </div>
      ))}

      {deadlines.map(({ task, subject, days }, i) => (
        <span
          key={task.id}
          title={`${subject.code} ${task.title} · ${countdownText(days)}`}
          className="absolute size-2.5 -translate-x-1/2 rounded-full ring-2 ring-paper motion-safe:animate-rise"
          style={{ left: pct(days), top: 44 - (i % 2) * 10, backgroundColor: subject.color, animationDelay: `${800 + i * 60}ms` }}
        />
      ))}

      {exams.map(({ exam, subject, days }, i) => (
        <div key={exam.subjectId} className="absolute top-[55px] -translate-x-1/2 motion-safe:animate-rise" style={{ left: pct(days), animationDelay: `${1000 + i * 100}ms` }}>
          <span className="mx-auto block size-4 rotate-45 border-2 bg-paper" style={{ borderColor: subject.color }} />
          <span className="mt-9 block text-center text-[11px] leading-tight tracking-wider whitespace-nowrap" style={{ color: readableOn(subject.color) }}>
            {subject.code}
            <span className="block text-muted">{toOslo(exam.date).getDate()}.{toOslo(exam.date).getMonth() + 1}.</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Sju søyler (man–søn), stablet per fag, med en stiplet linje for dagsmålet. */
function WeekRhythm({ now }: { now: Date }) {
  const MAX = 10
  const DAILY_GOAL = 8
  const labels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
  const today = (now.getDay() + 6) % 7

  return (
    <div className="relative mt-6 h-48">
      <div className="absolute inset-x-0 border-t border-dashed border-taupe" style={{ bottom: `calc(${(DAILY_GOAL / MAX) * 100}% * 0.85 + 1.5rem)` }}>
        <span className="absolute right-0 -top-4 text-[10px] text-muted">{DAILY_GOAL} t</span>
      </div>
      <div className="grid h-full grid-cols-7 gap-3">
        {hoursByDay.map((day, i) => {
          const sum = Object.values(day).reduce((a, b) => a + b, 0)
          return (
            <div key={i} className="flex flex-col items-center justify-end gap-2">
              <div className="flex w-full max-w-9 origin-bottom flex-col-reverse overflow-hidden rounded-md motion-safe:animate-grow-y" style={{ height: `${(sum / MAX) * 85}%`, animationDelay: `${500 + i * 70}ms` }}>
                {subjects.map((s) => (day[s.id] ? <div key={s.id} style={{ height: `${(day[s.id] / sum) * 100}%`, backgroundColor: withAlpha(s.color, 0.9) }} /> : null))}
              </div>
              <span className={`text-[11px] ${i === today ? 'font-bold text-burgundy' : 'text-muted'}`}>{labels[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
