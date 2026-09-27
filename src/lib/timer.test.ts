import { describe, expect, it } from 'vitest'
import { addMinutes, elapsedMs, formatClock, pause, remainingMs, resume, startTimer, stop, tick } from './timer'

const MIN = 60_000
const T0 = 1_000_000_000_000
const start = () => startTimer({ subjectId: 'mat', taskId: null, sessionId: 's1', title: 'Fagøkt', workMinutes: 50, breakMinutes: 10 }, T0)

describe('fokus-timer', () => {
  it('teller ned fra klokka', () => {
    const s = start()
    expect(remainingMs(s, T0 + 10 * MIN)).toBe(40 * MIN)
    expect(formatClock(remainingMs(s, T0 + 10 * MIN + 1500))).toBe('39:59')
  })

  it('står stille på pause', () => {
    let s = start()
    s = pause(s, T0 + 10 * MIN)
    expect(elapsedMs(s, T0 + 30 * MIN)).toBe(10 * MIN) // 20 min pause teller ikke
    s = resume(s, T0 + 30 * MIN)
    expect(remainingMs(s, T0 + 35 * MIN)).toBe(35 * MIN)
  })

  it('logger jobbtiden og starter pausen når økten er ferdig', () => {
    const r = tick(start(), T0 + 50 * MIN + 5000)
    expect(r.completedWork).toEqual({ minutes: 50, startedAt: T0, endedAt: T0 + 50 * MIN })
    expect(r.state?.phase).toBe('break')
    expect(remainingMs(r.state!, T0 + 50 * MIN + 5000)).toBe(10 * MIN - 5000)
  })

  it('håndterer at appen var lukket lenge: logger økten og avslutter', () => {
    const r = tick(start(), T0 + 3 * 60 * MIN)
    expect(r.completedWork?.minutes).toBe(50)
    expect(r.state).toBeNull()
    expect(r.breakOver).toBe(true)
  })

  it('er ferdig når pausen er over', () => {
    const inBreak = tick(start(), T0 + 50 * MIN).state!
    expect(tick(inBreak, T0 + 61 * MIN)).toEqual({ state: null, breakOver: true })
  })

  it('logger hele minutter ved tidlig avslutning, men ikke under ett minutt', () => {
    expect(stop(start(), T0 + 23 * MIN + 40_000)).toEqual({ minutes: 23, startedAt: T0, endedAt: T0 + 23 * MIN + 40_000 })
    expect(stop(start(), T0 + 30_000)).toBeNull()
  })

  it('kan forlenge økten med noen minutter', () => {
    expect(remainingMs(addMinutes(start(), 5), T0)).toBe(55 * MIN)
  })
})
