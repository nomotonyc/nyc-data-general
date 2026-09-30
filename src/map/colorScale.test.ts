import { describe, expect, it } from 'vitest'
import { equalIntervalScale } from './colorScale'

const ramp = ['r0', 'r1', 'r2', 'r3', 'r4']

describe('equalIntervalScale', () => {
  const scale = equalIntervalScale([0, 100], ramp)

  it('gives the lowest value the lightest step and the highest the darkest', () => {
    expect(scale(0)).toBe('r0')
    expect(scale(100)).toBe('r4')
  })

  it('splits the range into equal-width bins', () => {
    expect(scale(19.9)).toBe('r0')
    expect(scale(20)).toBe('r1')
    expect(scale(59.9)).toBe('r2')
    expect(scale(80)).toBe('r4')
  })

  it('clamps values outside the range', () => {
    expect(scale(-5)).toBe('r0')
    expect(scale(500)).toBe('r4')
  })

  it('uses the middle step when every value is the same', () => {
    expect(equalIntervalScale([7, 7, 7], ramp)(7)).toBe('r2')
  })

  it('refuses to build a scale from no values', () => {
    expect(() => equalIntervalScale([], ramp)).toThrow(/no values/)
  })
})
