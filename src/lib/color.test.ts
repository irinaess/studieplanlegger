import { describe, expect, it } from 'vitest'
import { contrastRatio, readableOn } from './color'

describe('readableOn', () => {
  it('mørkner taupe så den kan brukes som tekst på bakgrunnen', () => {
    expect(contrastRatio('#AC9C8D', '#EFE9E1')).toBeLessThan(4.5)
    const darker = readableOn('#AC9C8D')
    expect(contrastRatio(darker, '#EFE9E1')).toBeGreaterThanOrEqual(4.5)
  })

  it('lar farger som allerede er mørke nok være i fred', () => {
    expect(readableOn('#72383D')).toBe('#72383d')
    expect(readableOn('#3E4A5C')).toBe('#3e4a5c')
  })
})
