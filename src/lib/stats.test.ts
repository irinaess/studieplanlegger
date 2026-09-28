import { describe, expect, it } from 'vitest'
import type { DayPlan, DayPlanSession, Subject, Task } from '../types'
import { actualMinutesByTask, correctionFor, corrections, describeCorrection, estimateSamples } from './estimates'
import { currentStreak, reachedGoal, recentDays } from './streak'
import { buildWeeklyReport } from './weeklyReport'

const MAT: Subject = { id: 'mat', code: 'MAT111', name: 'Kalkulus', color: '#72383D', weight: 4, weeklyGoalHours: 15 }
const INFO: Subject = { id: 'info', code: 'INFO132', name: 'Programmering', color: '#3E4A5C', weight: 2, weeklyGoalHours: 10 }

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id, subjectId: 'mat', title: id, type: 'ovinger', estimateMinutes: 100, deadline: null, starred: false, status: 'done',
    moveCount: 0, notes: null, completedAt: '2026-09-30T10:00:00Z', subtasks: [], ...overrides,
  }
}

describe('estimatlæring', () => {
  it('tar største av timer-tid og innsjekk-tid, så ingenting telles dobbelt', () => {
    const actual = actualMinutesByTask([{ taskId: 'a', minutes: 60 }, { taskId: 'a', minutes: 40 }], [{ taskId: 'a', actualMinutes: 80 }, { taskId: 'b', actualMinutes: 30 }])
    expect(actual.get('a')).toBe(100)
    expect(actual.get('b')).toBe(30)
  })

  it('bruker median, venter til 3 oppgaver, og får full vekt ved 6', () => {
    const tasks = ['a', 'b', 'c'].map((id) => task(id))
    const actual = new Map([['a', 120], ['b', 130], ['c', 400]]) // én som gikk helt galt
    const list = corrections(estimateSamples(tasks, actual))
    expect(list[0].medianRatio).toBe(1.3) // medianen ignorerer 400-minutteren
    expect(list[0].factor).toBeCloseTo(1.15) // 3 av 6 oppgaver → halv vekt
    expect(correctionFor(list, { subjectId: 'mat', type: 'ovinger' })).toBeCloseTo(1.15)
    expect(correctionFor(list, { subjectId: 'mat', type: 'lesing' })).toBe(1)
    expect(describeCorrection(list[0], [MAT])).toBe('MAT111-øvingsoppgaver tar deg i snitt 30 % lengre tid enn du anslår (3 oppgaver).')
  })

  it('bruker ikke faktoren med færre enn 3 oppgaver', () => {
    const list = corrections(estimateSamples([task('a'), task('b')], new Map([['a', 200], ['b', 200]])))
    expect(list[0].factor).toBe(1)
    expect(describeCorrection(list[0], [MAT])).toContain('For få til å brukes i planen ennå.')
  })
})

const s = (planned: number, actual: number | null, status: DayPlanSession['status']): DayPlanSession => ({
  id: Math.random().toString(), kind: 'subject', subjectId: 'mat', taskId: null, topicId: null, startAt: '', endAt: '', plannedMinutes: planned, actualMinutes: actual, status,
})
const plan = (date: string, sessions: DayPlanSession[]): DayPlan => ({ id: date, date, startTime: '08:00', endTime: '16:00', energy: 'normal', priority: '', warnings: [], stoppedAt: null, sessions })
const good = (date: string) => plan(date, [s(50, 50, 'done'), s(50, 40, 'done'), s(50, 30, 'partial')]) // 120/150 = 80 %
const bad = (date: string) => plan(date, [s(50, 50, 'done'), s(50, null, 'moved')])

describe('streak', () => {
  it('nådd dagsplan = minst 80 % av planlagt tid', () => {
    expect(reachedGoal(good('2026-09-28'))).toBe(true)
    expect(reachedGoal(bad('2026-09-28'))).toBe(false)
  })

  it('teller dager på rad, hopper over helg og en uferdig dag i dag', () => {
    const plans = [good('2026-09-24'), bad('2026-09-25'), good('2026-09-28'), good('2026-09-29'), good('2026-10-01'), bad('2026-10-02')]
    // I dag (fredag 2.10) er ikke ferdig ennå. Torsdag, onsdag uten plan (nøytral), tirsdag, mandag = 3. Fredag før brøt.
    expect(currentStreak(plans, '2026-10-02')).toBe(3)
    expect(currentStreak(plans, '2026-10-03')).toBe(0) // lørdag: fredagen ble ikke nådd
  })

  it('lager prikker for de siste dagene', () => {
    const days = recentDays([good('2026-09-28'), bad('2026-09-29'), bad('2026-09-30')], '2026-09-30', 4)
    expect(days.map((d) => d.state)).toEqual(['none', 'reached', 'missed', 'today'])
  })
})

describe('ukesrapport', () => {
  const week = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']

  it('er nøktern, peker på mønstre og stiller spørsmål ut fra dem', () => {
    const report = buildWeeklyReport({
      weekDates: week,
      subjects: [MAT, INFO],
      hoursBySubject: { mat: 14, info: 2 },
      goal: 40,
      tasks: [task('ferdig'), task('gammel', { completedAt: '2026-09-20T10:00:00Z' }), task('Oblig 3', { status: 'todo', moveCount: 4, completedAt: null })],
      plans: [bad('2026-09-28'), bad('2026-09-29')],
      actualByTask: new Map([['ferdig', 150]]),
      streak: 0,
    })
    expect(report.completedTasks.map((t) => t.id)).toEqual(['ferdig'])
    expect(report.observations).toEqual([
      'Du jobbet 16 av 40 timer (40 %).',
      'INFO132 fikk 2 av 10 timer, klart minst i forhold til målet.',
      '2 av 4 planlagte økter ble flyttet eller ikke gjort. Enten har planene vært for ambisiøse, eller noe annet har tatt tiden.',
      'Én oppgave er flyttet tre ganger eller mer: «Oblig 3» (4).',
      'Estimatene bommet typisk med 50 % på oppgavene du fullførte.',
    ])
    expect(report.questions.map((q) => q.id)).toEqual(['best', 'pattern', 'next'])
    expect(report.questions[1].text).toContain('«Oblig 3»')
  })

  it('sier rett ut når ukemålet er nådd, uten mer skryt', () => {
    const report = buildWeeklyReport({ weekDates: week, subjects: [MAT], hoursBySubject: { mat: 41 }, goal: 40, tasks: [], plans: [good('2026-09-28')], actualByTask: new Map(), streak: 5 })
    expect(report.observations).toEqual(['Du jobbet 41 av 40 timer. Ukemålet er nådd.'])
    expect(report.questions[1].text).toBe('Hva stoppet deg oftest denne uken?')
  })
})
