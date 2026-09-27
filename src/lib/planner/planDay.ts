/**
 * Planleggingsalgoritmen: lager en dagsplan i pomodoro-økter.
 *
 * Oversikt:
 *  1. Finn ledig tid (start–slutt minus hendelser) og legg inn lunsj.
 *  2. Del ledig tid inn i økter (f.eks. 50 min jobb / 10 min pause).
 *     Lav energi → ca. 70 % av øktene.
 *  3. Ranger fagene: vekting, hvor langt bak ukemålet de er, og hva som haster.
 *  4. Velg fag: ett før lunsj og ett etter. Tung dag (≤ 3 økter) → bare ett fag.
 *     Oppgaver med frist innen 2 dager får plassen de trenger, også på tvers av lunsj.
 *  5. Fyll hvert fags økter: først det som MÅ gjøres, så det som BØR (maks halvparten),
 *     resten blir fagøkter med forslag til oppgave.
 *  6. Rekkefølge etter energi: høy = tungt først, lav = lett først.
 *  7. Skriv "Dagens prioritet" og ærlige advarsler hvis tiden ikke strekker til.
 */
import { formatHours } from '../format'
import { HEAVINESS, behindShare, subjectHeaviness, subjectScores, taskTier } from './priorities'
import { buildSlots, placeLunch, subtractIntervals } from './timeSlots'
import type { Interval, PlanInput, PlanOutput, PlannedSession, PlannerSubject, PlannerTask } from './types'

/** Andel av øktene som beholdes ved lav energi. */
export const LOW_ENERGY_SHARE = 0.7
/** Så få økter eller færre gir en "tung dag" med bare ett fag. */
export const HEAVY_DAY_MAX_SESSIONS = 3

interface Assignment {
  kind: 'task' | 'subject'
  task: PlannerTask | null
}

export function planDay(input: PlanInput): PlanOutput {
  const { energy, settings } = input
  const work = settings.workMinutes

  // ---------- 1. Ledig tid og lunsj ----------
  const freeBeforeLunch = subtractIntervals({ start: input.start, end: input.end }, input.busy)
  const lunch = placeLunch(freeBeforeLunch, settings.lunchStart, settings.lunchMinutes)
  const free = lunch ? freeBeforeLunch.flatMap((w) => subtractIntervals(w, [lunch])) : freeBeforeLunch

  // ---------- 2. Økter ----------
  let slots = buildSlots(free, work, settings.breakMinutes)
  if (energy === 'low' && slots.length > 1) slots = slots.slice(0, Math.max(1, Math.round(slots.length * LOW_ENERGY_SHARE)))

  const subjects = input.subjects.filter((s) => s.weight > 0)
  if (slots.length === 0 || subjects.length === 0) {
    return {
      sessions: [],
      lunch,
      priority: slots.length === 0 ? 'Det er ingen ledig tid til studieøkter i dette tidsrommet.' : 'Legg inn fag under Innstillinger, så kan appen lage en plan.',
      warnings: [],
    }
  }
  const tasks = input.tasks.filter((t) => t.remainingMinutes > 0)
  const remaining = new Map(tasks.map((t) => [t.id, t.remainingMinutes]))
  const sessionsNeeded = (t: PlannerTask) => Math.ceil((remaining.get(t.id) ?? 0) / work)

  // ---------- 3. Ranger fagene ----------
  const scores = subjectScores(subjects, tasks, input.weekProgress)
  const ranked = [...subjects].sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.sortOrder - b.sortOrder)

  // ---------- 4. Velg fag og del dagen ----------
  const heavyDay = slots.length <= HEAVY_DAY_MAX_SESSIONS
  let chosen = ranked.slice(0, heavyDay ? 1 : 2)
  if (energy !== 'normal') {
    const heaviness = (s: PlannerSubject) => subjectHeaviness(s.id, tasks)
    chosen = [...chosen].sort((a, b) => (energy === 'high' ? heaviness(b) - heaviness(a) : heaviness(a) - heaviness(b)) || a.sortOrder - b.sortOrder)
  }

  const mustNeed = (s: PlannerSubject | undefined) =>
    s ? tasks.filter((t) => t.subjectId === s.id && taskTier(t) === 'must').reduce((sum, t) => sum + sessionsNeeded(t), 0) : 0
  const blocks = splitIntoBlocks(slots, chosen, lunch, mustNeed(chosen[0]), mustNeed(chosen[1]))

  // ---------- 5 og 6. Fyll øktene og sorter etter energi ----------
  const sessions: PlannedSession[] = []
  const tasksWithSessions = new Map<string, number>()
  for (const block of blocks) {
    const assignments = fillBlock(block.subject, block.slots.length, tasks, remaining, work, energy)
    assignments.forEach((a, i) => {
      const slot = block.slots[i]
      if (a.task && a.kind === 'task') tasksWithSessions.set(a.task.id, (tasksWithSessions.get(a.task.id) ?? 0) + 1)
      sessions.push({
        ...slot,
        kind: a.kind,
        subjectId: block.subject.id,
        taskId: a.task?.id ?? null,
        title: a.kind === 'task' ? a.task!.title : a.task ? `Fagøkt · ${a.task.title}` : 'Fagøkt',
      })
    })
  }

  // ---------- 7. Forklaring og advarsler ----------
  const codeOf = (id: string) => subjects.find((s) => s.id === id)?.code ?? ''
  const warnings = tasks
    .filter((t) => taskTier(t) === 'must' && (remaining.get(t.id) ?? 0) > 0)
    .map((t) =>
      tasksWithSessions.has(t.id)
        ? `${t.title} i ${codeOf(t.subjectId)} trenger ca. ${formatHours((remaining.get(t.id) ?? 0) / 60)} t mer enn det er plass til i dag.`
        : `${t.title} i ${codeOf(t.subjectId)} har frist ${whenText(t.deadlineDays!)}, men får ikke plass i dag.`,
    )

  const priority = explain({ tasks, tasksWithSessions, blocks, lunch, energy, heavyDay, slotsCount: slots.length, codeOf, weekProgress: input.weekProgress })

  return { sessions: sessions.sort((a, b) => a.start - b.start), lunch, priority, warnings }
}

/**
 * Deler øktene mellom ett eller to fag: det første før lunsj, det andre etter.
 * Uten lunsj midt på dagen deles øktene omtrent på midten.
 * Må-oppgaver (frist innen 2 dager) kan flytte skillet, så de får plassen de trenger.
 */
function splitIntoBlocks(slots: Interval[], chosen: PlannerSubject[], lunch: Interval | null, needFirst: number, needSecond: number) {
  if (chosen.length === 1) return [{ subject: chosen[0], slots }]

  let split = lunch ? slots.filter((s) => s.end <= lunch.start).length : Math.ceil(slots.length / 2)
  if (split === 0 || split === slots.length) split = Math.ceil(slots.length / 2)

  const lowest = needFirst
  const highest = slots.length - needSecond
  split = lowest <= highest ? Math.min(Math.max(split, lowest), highest) : Math.round((slots.length * needFirst) / (needFirst + needSecond))

  return [
    { subject: chosen[0], slots: slots.slice(0, split) },
    { subject: chosen[1], slots: slots.slice(split) },
  ].filter((b) => b.slots.length > 0)
}

/** Bestemmer hva hver økt i et fag skal brukes til. */
function fillBlock(
  subject: PlannerSubject,
  count: number,
  allTasks: PlannerTask[],
  remaining: Map<string, number>,
  work: number,
  energy: PlanInput['energy'],
): Assignment[] {
  const own = allTasks.filter((t) => t.subjectId === subject.id)
  const byDeadline = (a: PlannerTask, b: PlannerTask) =>
    (a.deadlineDays ?? Infinity) - (b.deadlineDays ?? Infinity) || Number(b.starred) - Number(a.starred) || a.title.localeCompare(b.title, 'nb')
  const must = own.filter((t) => taskTier(t) === 'must').sort(byDeadline)
  const should = own.filter((t) => taskTier(t) === 'should').sort(byDeadline)
  const normal = own.filter((t) => taskTier(t) === 'normal').sort(byDeadline)

  const result: Assignment[] = []
  let free = count
  const take = (task: PlannerTask, max: number) => {
    const n = Math.min(Math.ceil((remaining.get(task.id) ?? 0) / work), max)
    for (let i = 0; i < n; i++) result.push({ kind: 'task', task })
    remaining.set(task.id, Math.max(0, (remaining.get(task.id) ?? 0) - n * work))
    return n
  }

  // Må: så mye som trengs
  for (const t of must) free -= take(t, free)
  // Bør: maks halvparten av fagets økter (minst én)
  let shouldCap = Math.max(1, Math.floor(count / 2))
  for (const t of should) {
    const n = take(t, Math.min(free, shouldCap))
    free -= n
    shouldCap -= n
  }
  // Resten: fagøkter med forslag. Lav energi foreslår lett arbeid (lesing) først.
  const suggestions = [...should, ...normal].sort((a, b) => (energy === 'low' ? HEAVINESS[a.type] - HEAVINESS[b.type] : 0))
  while (free > 0) {
    const suggestion = suggestions.find((t) => (remaining.get(t.id) ?? 0) > 0) ?? null
    if (suggestion) remaining.set(suggestion.id, Math.max(0, remaining.get(suggestion.id)! - work))
    result.push({ kind: 'subject', task: suggestion })
    free--
  }

  // Rekkefølge etter energi (stabil sortering: like tunge beholder rekkefølgen sin)
  const weight = (a: Assignment) => (a.task ? HEAVINESS[a.task.type] : 2)
  if (energy === 'high') result.sort((a, b) => weight(b) - weight(a))
  if (energy === 'low') result.sort((a, b) => weight(a) - weight(b))
  return result
}

/** "i dag", "i morgen", "om 3 dager" */
function whenText(days: number): string {
  if (days < 0) return 'som har gått ut'
  if (days === 0) return 'i dag'
  if (days === 1) return 'i morgen'
  return `om ${days} dager`
}

/** Setter sammen "Dagens prioritet": 2–3 korte, konkrete setninger. */
function explain(ctx: {
  tasks: PlannerTask[]
  tasksWithSessions: Map<string, number>
  blocks: { subject: PlannerSubject; slots: Interval[] }[]
  lunch: Interval | null
  energy: PlanInput['energy']
  heavyDay: boolean
  slotsCount: number
  codeOf: (id: string) => string
  weekProgress: number
}): string {
  const parts: string[] = []
  const sessionsWord = (n: number) => (n === 1 ? '1 økt' : `${n} økter`)

  // Det som haster mest og faktisk fikk tid
  const prioritized = ctx.tasks
    .filter((t) => ctx.tasksWithSessions.has(t.id) && taskTier(t) !== 'normal')
    .sort((a, b) => (a.deadlineDays ?? Infinity) - (b.deadlineDays ?? Infinity))[0]
  if (prioritized) {
    const n = ctx.tasksWithSessions.get(prioritized.id)!
    const code = ctx.codeOf(prioritized.subjectId)
    if (prioritized.deadlineDays !== null && prioritized.deadlineDays < 0) parts.push(`${prioritized.title} i ${code} har passert fristen, så den får ${sessionsWord(n)}.`)
    else if (prioritized.deadlineDays !== null && prioritized.deadlineDays <= 6) parts.push(`${prioritized.title} i ${code} har frist ${whenText(prioritized.deadlineDays)}, så den får ${sessionsWord(n)}.`)
    else parts.push(`${prioritized.title} i ${code} er stjernemerket og får ${sessionsWord(n)}.`)
  }

  // Hvordan dagen er delt
  const codes = ctx.blocks.map((b) => b.subject.code)
  if (ctx.heavyDay) parts.push(`Lite ledig tid i dag, så alt går til ${codes[0]}.`)
  else if (codes.length === 2) parts.push(ctx.lunch && ctx.blocks[0].slots.every((s) => s.end <= ctx.lunch!.start) ? `${codes[0]} før lunsj, ${codes[1]} etter.` : `${codes[0]} først, så ${codes[1]}.`)

  // Energi
  if (ctx.energy === 'high') parts.push(`Høy energi: det tyngste ligger tidlig, mens du er skarp.`)
  if (ctx.energy === 'low') parts.push(`Lav energi: ${sessionsWord(ctx.slotsCount)} i dag, og lettere arbeid først.`)

  // Fag som ligger bak ukemålet (hvis ikke noe haster)
  if (!prioritized) {
    const behind = ctx.blocks
      .map((b) => ({ s: b.subject, hours: behindShare(b.subject, ctx.weekProgress) * b.subject.weeklyGoalHours }))
      .filter((x) => x.hours >= 1)
      .sort((a, b) => b.hours - a.hours)[0]
    if (behind) parts.push(`${behind.s.code} ligger ${formatHours(behind.hours)} t bak ukemålet.`)
  }

  return parts.join(' ')
}
