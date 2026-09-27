import { describe, expect, it } from 'vitest'
import { planDay } from './planDay'
import { remainingMinutes, taskTier } from './priorities'
import { buildSlots, placeLunch, subtractIntervals } from './timeSlots'
import type { PlanInput, PlannerSubject, PlannerTask } from './types'

/** Klokkeslett → minutter, så testene blir lette å lese: t('10:15') = 615 */
const t = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const MAT: PlannerSubject = { id: 'mat', code: 'MAT111', weight: 4, weeklyGoalHours: 15, hoursThisWeek: 0, sortOrder: 1 }
const ITOK: PlannerSubject = { id: 'itok', code: 'ITØK101', weight: 4, weeklyGoalHours: 15, hoursThisWeek: 0, sortOrder: 2 }
const INFO: PlannerSubject = { id: 'info', code: 'INFO132', weight: 2, weeklyGoalHours: 10, hoursThisWeek: 0, sortOrder: 3 }

function task(overrides: Partial<PlannerTask>): PlannerTask {
  return { id: 'x', subjectId: 'mat', title: 'Oppgave', type: 'ovinger', remainingMinutes: 120, deadlineDays: null, starred: false, ...overrides }
}

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    start: t('08:00'),
    end: t('16:00'),
    energy: 'normal',
    settings: { workMinutes: 50, breakMinutes: 10, lunchStart: t('11:30'), lunchMinutes: 30 },
    busy: [],
    subjects: [MAT, ITOK, INFO],
    tasks: [],
    weekProgress: 0,
    ...overrides,
  }
}

const subjectsInOrder = (plan: ReturnType<typeof planDay>) => plan.sessions.map((s) => s.subjectId)

describe('ledig tid og økter', () => {
  it('trekker forelesninger fra dagen', () => {
    expect(subtractIntervals({ start: t('08:00'), end: t('16:00') }, [{ start: t('10:15'), end: t('12:00') }])).toEqual([
      { start: t('08:00'), end: t('10:15') },
      { start: t('12:00'), end: t('16:00') },
    ])
  })

  it('legger lunsj 11:30, eller så nær som mulig hvis noe er i veien', () => {
    expect(placeLunch([{ start: t('08:00'), end: t('16:00') }], t('11:30'), 30)).toEqual({ start: t('11:30'), end: t('12:00') })
    // Forelesning 10:15–12:00: lunsj rett etter
    const free = [{ start: t('08:00'), end: t('10:15') }, { start: t('12:00'), end: t('16:00') }]
    expect(placeLunch(free, t('11:30'), 30)).toEqual({ start: t('12:00'), end: t('12:30') })
    // Starter dagen kl. 14, blir det ingen lunsj
    expect(placeLunch([{ start: t('14:00'), end: t('16:00') }], t('11:30'), 30)).toBeNull()
  })

  it('lager 50/10-økter, og en kortere siste økt bare hvis den er minst 25 min', () => {
    const slots = buildSlots([{ start: t('08:00'), end: t('10:15') }], 50, 10)
    expect(slots.map((s) => `${clock(s.start)}–${clock(s.end)}`)).toEqual(['08:00–08:50', '09:00–09:50'])
    const longer = buildSlots([{ start: t('08:00'), end: t('10:30') }], 50, 10)
    expect(longer.at(-1)).toEqual({ start: t('10:00'), end: t('10:30') })
  })
})

describe('prioritering', () => {
  it('deler inn i må, bør og normal', () => {
    expect(taskTier(task({ deadlineDays: 2 }))).toBe('must')
    expect(taskTier(task({ deadlineDays: -1 }))).toBe('must')
    expect(taskTier(task({ deadlineDays: 5 }))).toBe('should')
    expect(taskTier(task({ starred: true }))).toBe('should')
    expect(taskTier(task({ deadlineDays: 10 }))).toBe('normal')
  })

  it('regner gjenstående arbeid med deloppgaver og korreksjonsfaktor', () => {
    const subtasks = [{ done: true }, { done: true }, { done: false }, { done: false }]
    expect(remainingMinutes(360, subtasks)).toBe(180) // halvparten igjen
    expect(remainingMinutes(360, subtasks, 1.3)).toBe(234) // du bruker 30 % lengre tid enn du tror
    expect(remainingMinutes(60, [], 1, 90)).toBe(0) // aldri negativ
  })
})

describe('planDay', () => {
  it('vanlig dag: lunsj 11:30, ett fag før og ett etter', () => {
    const plan = planDay(input())
    expect(plan.lunch).toEqual({ start: t('11:30'), end: t('12:00') })
    // 08, 09, 10, 11:00–11:30 (kort økt, 30 min) før lunsj + 12, 13, 14, 15 etter
    expect(plan.sessions).toHaveLength(8)
    const before = plan.sessions.filter((s) => s.end <= t('11:30')).map((s) => s.subjectId)
    const after = plan.sessions.filter((s) => s.start >= t('12:00')).map((s) => s.subjectId)
    expect(new Set(before)).toEqual(new Set(['mat']))
    expect(new Set(after)).toEqual(new Set(['itok']))
    expect(plan.priority).toContain('MAT111 før lunsj, ITØK101 etter')
    // ingen økter overlapper hverandre eller lunsjen
    for (const s of plan.sessions) expect(s.end <= t('11:30') || s.start >= t('12:00')).toBe(true)
  })

  it('frist i morgen i INFO132: faget kommer med, og oppgaven får tiden den trenger', () => {
    const lab = task({ id: 'lab', subjectId: 'info', title: 'Lab 5', remainingMinutes: 150, deadlineDays: 1 })
    const plan = planDay(input({ tasks: [lab] }))
    const labSessions = plan.sessions.filter((s) => s.taskId === 'lab' && s.kind === 'task')
    expect(labSessions).toHaveLength(3) // 150 min → 3 økter à 50
    expect(plan.sessions[0].subjectId).toBe('info') // haster mest → først på en vanlig dag
    expect(plan.priority).toContain('Lab 5 i INFO132 har frist i morgen, så den får 3 økter.')
    expect(plan.warnings).toEqual([])
  })

  it('sier ærlig fra når en frist ikke rekkes', () => {
    const big = task({ id: 'big', title: 'Oblig 3', type: 'oblig', remainingMinutes: 600, deadlineDays: 0 })
    const plan = planDay(input({ start: t('13:00'), end: t('16:00'), tasks: [big] }))
    expect(plan.sessions.every((s) => s.taskId === 'big')).toBe(true)
    expect(plan.warnings[0]).toMatch(/Oblig 3 i MAT111 trenger ca\. 7,5 t mer/)
  })

  it('tung dag (3 økter eller færre): bare ett fag', () => {
    const busy = [
      { start: t('08:15'), end: t('10:00') },
      { start: t('10:15'), end: t('12:00') },
      { start: t('12:30'), end: t('14:15') },
    ]
    const plan = planDay(input({ busy }))
    expect(plan.sessions.length).toBeLessThanOrEqual(3)
    expect(new Set(subjectsInOrder(plan)).size).toBe(1)
    expect(plan.priority).toContain('Lite ledig tid i dag')
  })

  it('lav energi: færre økter og lesing først', () => {
    const normal = planDay(input())
    const low = planDay(
      input({
        energy: 'low',
        tasks: [
          task({ id: 'oving', subjectId: 'mat', title: 'Øving 6', type: 'ovinger', remainingMinutes: 300 }),
          task({ id: 'lesing', subjectId: 'mat', title: 'Les kap. 4', type: 'lesing', remainingMinutes: 100 }),
        ],
      }),
    )
    expect(low.sessions.length).toBe(Math.round(normal.sessions.length * 0.7))
    expect(low.sessions[0].title).toBe('Fagøkt · Les kap. 4')
    expect(low.priority).toContain('Lav energi')
  })

  it('høy energi: det tyngste faget først', () => {
    const plan = planDay(
      input({
        energy: 'high',
        subjects: [ITOK, MAT, INFO].map((s, i) => ({ ...s, sortOrder: i })), // ITØK først i lista
        tasks: [
          task({ id: 'les', subjectId: 'itok', title: 'Les kap. 3', type: 'lesing' }),
          task({ id: 'ov', subjectId: 'mat', title: 'Øving 6', type: 'ovinger' }),
        ],
      }),
    )
    expect(plan.sessions[0].subjectId).toBe('mat')
  })

  it('fag som ligger bak ukemålet blir valgt', () => {
    // Torsdag morgen (60 % av uka gått): MAT og ITØK i rute, INFO har 0 av 10 t
    const plan = planDay(
      input({
        weekProgress: 0.6,
        subjects: [
          { ...MAT, hoursThisWeek: 9 },
          { ...ITOK, hoursThisWeek: 9 },
          { ...INFO, hoursThisWeek: 0 },
        ],
      }),
    )
    expect(subjectsInOrder(plan)).toContain('info')
    expect(plan.priority).toContain('INFO132 ligger 6 t bak ukemålet.')
  })

  it('en hel uke uten frister: MAT og ITØK omtrent 50/50, og INFO blir ikke glemt', () => {
    const hours: Record<string, number> = { mat: 0, itok: 0, info: 0 }
    for (let day = 0; day < 5; day++) {
      const plan = planDay(input({ weekProgress: day / 5, subjects: [MAT, ITOK, INFO].map((s) => ({ ...s, hoursThisWeek: hours[s.id] })) }))
      for (const s of plan.sessions) hours[s.subjectId] += (s.end - s.start) / 60
    }
    expect(hours.info).toBeGreaterThan(0)
    expect(Math.abs(hours.mat - hours.itok)).toBeLessThanOrEqual(4)
  })

  it('bruker 45/10 når det er valgt i innstillingene', () => {
    const plan = planDay(input({ settings: { workMinutes: 45, breakMinutes: 10, lunchStart: t('11:30'), lunchMinutes: 30 } }))
    expect(plan.sessions[0]).toMatchObject({ start: t('08:00'), end: t('08:45') })
    expect(plan.sessions[1].start).toBe(t('08:55'))
  })

  it('gir en forklaring i stedet for tom plan når det ikke er ledig tid', () => {
    const plan = planDay(input({ busy: [{ start: t('08:00'), end: t('16:00') }] }))
    expect(plan.sessions).toEqual([])
    expect(plan.priority).toContain('ingen ledig tid')
  })
})
