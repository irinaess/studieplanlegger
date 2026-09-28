import { describe, expect, it } from 'vitest'
import type { Exam, ExamTopic, Settings } from '../types'
import { describeRealism, effectiveWeeklyGoal, examBoost, examMode, readiness, realismCheck, reviewReason, scheduleNext, sortByPriority, topicPriority } from './exam'
import { toOslo } from './time'

const exams: Exam[] = [
  { id: 'e1', subjectId: 'itok', date: '2026-12-04T08:00:00Z', location: null },
  { id: 'e2', subjectId: 'mat', date: '2026-12-10T08:00:00Z', location: null },
]
const settings = { examModeWeeks: 4, weeklyGoalHours: 40, examWeeklyGoalHours: 45 } as Settings

function topic(id: string, overrides: Partial<ExamTopic> = {}): ExamTopic {
  return { id, subjectId: 'itok', title: id, confidence: 3, importance: 'medium', intervalDays: 1, nextReview: null, sortOrder: 0, ...overrides }
}

describe('eksamensmodus', () => {
  it('starter 4 uker før første eksamen og varer til siste', () => {
    expect(examMode(exams, settings, '2026-11-05')).toEqual({ active: false, startsOn: '2026-11-06' })
    expect(examMode(exams, settings, '2026-11-06').active).toBe(true)
    expect(examMode(exams, settings, '2026-12-10').active).toBe(true)
    expect(examMode(exams, settings, '2026-12-11').active).toBe(false)
    expect(examMode([], settings, '2026-11-20').active).toBe(false)
  })

  it('bruker høyere ukemål i eksamensmodus', () => {
    expect(effectiveWeeklyGoal(settings, exams, '2026-10-01')).toBe(40)
    expect(effectiveWeeklyGoal(settings, exams, '2026-11-20')).toBe(45)
  })

  it('gir mer vekt jo nærmere eksamen, men aldri null', () => {
    expect(examBoost(5)).toBeCloseTo(2.17, 1)
    expect(examBoost(30)).toBeCloseTo(1.38, 1)
    expect(examBoost(null)).toBe(1)
    expect(examBoost(5)).toBeGreaterThan(examBoost(30))
  })
})

describe('prioritering av temaer', () => {
  const today = '2026-11-20'
  it('lav trygghet × høy viktighet først, og temaer som forfaller får et løft', () => {
    const list = sortByPriority(
      [
        topic('trygg-viktig', { confidence: 5, importance: 'high' }),
        topic('usikker-lav', { confidence: 1, importance: 'low', nextReview: '2026-11-25' }),
        topic('usikker-høy', { confidence: 2, importance: 'high' }),
        topic('middels', { confidence: 3, importance: 'medium' }),
      ],
      today,
    )
    expect(list.map((t) => t.id)).toEqual(['usikker-høy', 'middels', 'usikker-lav', 'trygg-viktig'])
    expect(topicPriority(topic('x', { confidence: 2, importance: 'high' }), today)).toBe(4 * 3 * 1.5)
  })

  it('regner ut hvor klar du er for eksamen', () => {
    expect(readiness([topic('a', { confidence: 4 }), topic('b', { confidence: 5 }), topic('c', { confidence: 2 }), topic('d')])).toBe(0.5)
    expect(readiness([])).toBe(0)
  })
})

describe('spaced repetition', () => {
  it('lav trygghet: snart igjen. Høy trygghet: lengre og lengre mellomrom', () => {
    expect(scheduleNext(7, 1, '2026-11-01', null)).toEqual({ intervalDays: 1, nextReview: '2026-11-02' })
    expect(scheduleNext(1, 2, '2026-11-01', null).intervalDays).toBe(2)
    expect(scheduleNext(2, 3, '2026-11-01', null).intervalDays).toBe(3)
    expect(scheduleNext(3, 4, '2026-11-01', null).intervalDays).toBe(7)
    expect(scheduleNext(7, 5, '2026-11-01', null).intervalDays).toBe(21)
  })

  it('legger aldri neste repetisjon etter eksamen', () => {
    expect(scheduleNext(7, 5, '2026-11-28', '2026-12-04')).toEqual({ intervalDays: 5, nextReview: '2026-12-03' })
    expect(scheduleNext(7, 5, '2026-12-03', '2026-12-04').intervalDays).toBe(1)
  })
})

describe('realismesjekk', () => {
  const base = { daysLeft: 5, weeklyGoal: 45, subjectShare: 0.4, workMinutes: 50, today: '2026-11-29' } // 5 × 45/7 × 0,4 ≈ 12,9 t tilgjengelig

  it('sier ærlig fra og foreslår hva som bør prioriteres', () => {
    const topics = [
      topic('Konsumentteori', { confidence: 1, importance: 'high' }), // 4 økter
      topic('Produksjon', { confidence: 1, importance: 'high' }),
      topic('Markedsformer', { confidence: 2, importance: 'medium' }), // 3 økter
      topic('Spillteori', { confidence: 1, importance: 'low' }),
      topic('Velferd', { confidence: 1, importance: 'low' }),
      topic('Historikk', { confidence: 2, importance: 'low' }),
      topic('Ferdig', { confidence: 5, importance: 'high' }),
    ]
    const check = realismCheck({ ...base, topics })
    expect(check.enough).toBe(false)
    expect(check.prioritize.map((t) => t.title)).toEqual(['Konsumentteori', 'Produksjon', 'Markedsformer', 'Spillteori'])
    expect(describeRealism(check, 'ITØK101')).toBe(
      // 4 temaer på trygghet 1 (4 økter à 50 min) + 2 på trygghet 2 (3 økter) = 18,3 t
      'Du rekker trolig ikke alt i ITØK101: det trengs ca. 18,3 t, men det er ca. 12,9 t igjen. Prioriter Konsumentteori, Produksjon, Markedsformer. Velferd, Historikk har lav viktighet og kan nedprioriteres.',
    )
  })

  it('sier også fra når det ser greit ut', () => {
    const check = realismCheck({ ...base, topics: [topic('A', { confidence: 3 })] })
    expect(describeRealism(check, 'ITØK101')).toBe('Det ser ut til å gå: temaene i ITØK101 trenger ca. 1,7 t, og du har ca. 12,9 t.')
  })
})

describe('forklaring', () => {
  it('lager en kort og konkret begrunnelse', () => {
    const text = reviewReason(topic('Konsumentteori', { confidence: 2, importance: 'high' }), 'ITØK101', exams[0], toOslo('2026-11-23T08:00:00+01:00'))
    expect(text).toBe('Fokus på konsumentteori i dag: høy eksamensvekt, trygghet 2/5, 11 dager til ITØK101.')
  })
})
