import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Exam, ExamTopic, Settings, Subject, Task } from '../../types'
import { toOslo } from '../time'
import { buildPlanInput } from './fromAppData'
import { planDay } from './planDay'

const lecture: CalendarEvent = {
  id: 'e1', subjectId: 'mat', title: 'Forelesning', location: null, kind: 'recurring', weekday: 1, date: null,
  startTime: '10:15', endTime: '12:00', validFrom: null, validUntil: null, countsAsStudy: true, source: 'manual',
}
const settings: Settings = {
  displayName: 'Iris', workMinutes: 50, breakMinutes: 10, lunchMinutes: 30, lunchStart: '11:30', defaultEndTime: '16:00',
  weeklyGoalHours: 40, examModeWeeks: 4, examWeeklyGoalHours: 45, semesterStart: null,
}
const subjects: Subject[] = [{ id: 'mat', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 4, weeklyGoalHours: 15, sortOrder: 1 }]

describe('buildPlanInput', () => {
  it('henter hendelser, frister og gjenstående arbeid', () => {
    const oblig: Task = {
      id: 't1', subjectId: 'mat', title: 'Oblig 3', type: 'oblig', estimateMinutes: 360, deadline: '2026-09-29T12:00:00Z', starred: false,
      status: 'todo', moveCount: 0, notes: null, completedAt: null,
      subtasks: [
        { id: 'a', title: '1', done: true, sortOrder: 0 },
        { id: 'b', title: '2', done: false, sortOrder: 1 },
      ],
    }
    const done: Task = { ...oblig, id: 't2', status: 'done' }
    const input = buildPlanInput({
      date: '2026-09-28', start: '08:00', end: '16:00', energy: 'normal', now: toOslo('2026-09-28T08:00:00+02:00'),
      settings, events: [lecture], subjects, tasks: [oblig, done],
    })
    expect(input.busy).toEqual([{ start: 615, end: 720 }])
    expect(input.tasks).toEqual([expect.objectContaining({ id: 't1', remainingMinutes: 180, deadlineDays: 1 })])
    expect(input.weekProgress).toBe(0)
    expect(input.settings.lunchStart).toBe(690)
  })

  it('bruker den lærte korreksjonsfaktoren på gjenstående arbeid', () => {
    const oving: Task = {
      id: 'o', subjectId: 'mat', title: 'Øving 6', type: 'ovinger', estimateMinutes: 100, deadline: null, starred: false,
      status: 'todo', moveCount: 0, notes: null, completedAt: null, subtasks: [],
    }
    const input = buildPlanInput({
      date: '2026-09-28', start: '08:00', end: '16:00', energy: 'normal', now: toOslo('2026-09-28T08:00:00+02:00'),
      settings, events: [], subjects, tasks: [oving], correctionFactors: () => 1.3,
    })
    expect(input.tasks[0].remainingMinutes).toBe(130)
  })

  it('regner med logget tid og ferdige forelesninger når den vurderer ukemålet', () => {
    const input = buildPlanInput({
      date: '2026-09-30', start: '08:00', end: '16:00', energy: 'normal', now: toOslo('2026-09-30T08:00:00+02:00'), settings, events: [lecture], subjects, tasks: [],
      logs: [{ id: 'l', subjectId: 'mat', taskId: null, sessionId: null, startedAt: '2026-09-29T08:00:00Z', endedAt: '2026-09-29T09:00:00Z', minutes: 60, source: 'timer' }],
    })
    expect(input.subjects[0].hoursThisWeek).toBe(1.75 + 1) // mandagens forelesning + tirsdagens logg
  })
})

describe('eksamensmodus i planen', () => {
  const itok: Subject = { id: 'itok', code: 'ITØK101', name: 'Mikroøkonomi', color: '#AC9C8D', weight: 4, weeklyGoalHours: 15, sortOrder: 2 }
  const exams: Exam[] = [
    { id: 'x1', subjectId: 'itok', date: '2026-12-04T08:00:00Z', location: null },
    { id: 'x2', subjectId: 'mat', date: '2026-12-10T08:00:00Z', location: null },
  ]
  const topic = (id: string, overrides: Partial<ExamTopic>): ExamTopic => ({
    id, subjectId: 'itok', title: id, confidence: 3, importance: 'medium', intervalDays: 1, nextReview: null, sortOrder: 0, ...overrides,
  })
  const topics = [
    topic('Konsumentteori', { confidence: 2, importance: 'high' }),
    topic('Spillteori', { confidence: 4, importance: 'low', nextReview: '2026-12-01' }), // forfaller ikke ennå
  ]
  const args = {
    date: '2026-11-23', start: '08:00', end: '16:00', energy: 'normal' as const, now: toOslo('2026-11-23T08:00:00+01:00'),
    settings, events: [], subjects: [...subjects, itok], tasks: [], exams, topics,
  }

  it('gir faget med nærmest eksamen mer vekt og lager repetisjon av temaer som forfaller', () => {
    const input = buildPlanInput(args)
    const [mat, it] = input.subjects
    expect(it.weight / 4).toBeGreaterThan(mat.weight / 4) // ITØK101-eksamen kommer først
    expect(input.tasks.map((t) => t.id)).toEqual(['Konsumentteori'])
    expect(input.subjects[0].weeklyGoalHours).toBeCloseTo((15 * 45) / 40) // høyere ukemål i eksamensmodus
  })

  it('planen får en repetisjonsøkt og forklarer hvorfor', () => {
    const plan = planDay(buildPlanInput(args))
    const review = plan.sessions.find((s) => s.kind === 'review')
    expect(review).toMatchObject({ topicId: 'Konsumentteori', taskId: null, title: 'Repetisjon · Konsumentteori' })
    expect(plan.priority).toContain('Fokus på konsumentteori i dag: høy eksamensvekt, trygghet 2/5, 11 dager til ITØK101.')
  })

  it('gjør ingenting med eksamen før eksamensmodus starter', () => {
    const input = buildPlanInput({ ...args, date: '2026-10-01', now: toOslo('2026-10-01T08:00:00+02:00') })
    expect(input.tasks).toEqual([])
    expect(input.subjects[0].weight).toBe(4)
  })
})
