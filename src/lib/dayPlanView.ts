/**
 * Gjør en lagret dagsplan om til blokker for tidslinjen på forsiden:
 * økter fra planen + dagens hendelser fra kalenderen + lunsj.
 */
import type { CalendarEvent, DayPlan, PlanBlock, Settings, Task } from '../types'
import { minutesToClock, occurrencesOn } from './calendar'
import { placeLunch, subtractIntervals } from './planner/timeSlots'
import { clockToMinutes, isoToOsloParts } from './time'

type Status = NonNullable<PlanBlock['status']>

/** Status ut fra klokka: over = past, pågår = active, ellers planned. */
function timeStatus(start: number, end: number, nowMinutes: number): Status {
  if (end <= nowMinutes) return 'past'
  if (start <= nowMinutes) return 'active'
  return 'planned'
}

export function planBlocks({
  plan,
  events,
  tasks,
  settings,
  nowMinutes,
}: {
  plan: DayPlan
  events: CalendarEvent[]
  tasks: Task[]
  settings: Settings
  nowMinutes: number // minutter etter midnatt i dag
}): PlanBlock[] {
  const occurrences = occurrencesOn(events, plan.date)
  const blocks: PlanBlock[] = occurrences.map((o) => ({
    start: o.event.startTime,
    end: o.event.endTime,
    kind: 'event',
    subjectId: o.event.subjectId ?? undefined,
    title: o.event.title,
    status: timeStatus(o.start, o.end, nowMinutes),
  }))

  // Lunsjen regnes ut på samme måte som da planen ble laget.
  const free = subtractIntervals({ start: clockToMinutes(plan.startTime), end: clockToMinutes(plan.endTime) }, occurrences)
  const lunch = placeLunch(free, clockToMinutes(settings.lunchStart), settings.lunchMinutes)
  if (lunch) blocks.push({ start: minutesToClock(lunch.start), end: minutesToClock(lunch.end), kind: 'lunch', title: 'Lunsj' })

  for (const s of plan.sessions) {
    const start = isoToOsloParts(s.startAt).time
    const end = isoToOsloParts(s.endAt).time
    const task = tasks.find((t) => t.id === s.taskId)
    const title = s.kind === 'task' ? (task?.title ?? 'Oppgaveøkt') : task ? `Fagøkt · ${task.title}` : 'Fagøkt'
    const status: Status =
      s.status === 'moved' ? 'moved' : s.status === 'done' || s.status === 'partial' ? 'done' : timeStatus(clockToMinutes(start), clockToMinutes(end), nowMinutes)
    blocks.push({ start, end, kind: s.kind === 'task' ? 'task' : 'subject', subjectId: s.subjectId, taskId: s.taskId, title, status })
  }

  return blocks.sort((a, b) => a.start.localeCompare(b.start))
}
