import { describe, expect, it } from 'vitest'
import { cameraEasing, cubicBezier } from './easing'

describe('cubicBezier', () => {
  it('starts at 0 and ends at 1', () => {
    const ease = cubicBezier(0.2, 0.7, 0.2, 1)
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
  })

  it('matches CSS linear for the straight curve', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(linear(t)).toBeCloseTo(t, 3)
  })

  it('only ever moves forward', () => {
    const ease = cubicBezier(0.2, 0.7, 0.2, 1)
    let last = 0
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(ease(t)).toBeGreaterThanOrEqual(last)
      last = ease(t)
    }
  })
})

describe('cameraEasing', () => {
  it('eases in and out, so the camera neither jumps off nor stops dead', () => {
    expect(cameraEasing(0.1)).toBeLessThan(0.1)
    expect(cameraEasing(0.9)).toBeGreaterThan(0.9)
    expect(cameraEasing(0.5)).toBeGreaterThan(0.4)
    expect(cameraEasing(0.5)).toBeLessThan(0.7)
  })
})
