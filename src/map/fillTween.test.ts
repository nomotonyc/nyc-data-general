import { describe, expect, it } from 'vitest'
import { SOURCES } from './config'
import type { Choropleth } from './choropleth'
import { fillsAt, mixHex, planFills } from './fillTween'

describe('mixHex', () => {
  it('mixes two colours by a fraction', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#2a5db8', '#b8481a', 0.25)).toBe('#4e5891')
  })
})

describe('planFills', () => {
  const plan: Choropleth = {
    level: 'area', focus: null, boroughs: { Queens: '#111111' }, geography: 'battalions', areas: { 14: '#222222' },
    lo: 0, hi: 1, range: { from: 2025, to: 2025 }, adjusted: false,
  }

  it('lists every borough and every area of the plan’s geography, with null where uncoloured', () => {
    const fills = planFills(plan)
    expect(fills.get(`${SOURCES.boroughs}|Queens`)).toEqual({ source: SOURCES.boroughs, id: 'Queens', fill: '#111111' })
    expect(fills.get(`${SOURCES.boroughs}|Bronx`)?.fill).toBeNull()
    expect(fills.get(`${SOURCES.battalions}|14`)?.fill).toBe('#222222')
    expect(fills.size).toBe(5 + 49)
  })
})

describe('fillsAt', () => {
  const to = new Map([
    ['b|Queens', { source: 'b', id: 'Queens', fill: '#ffffff' }],
    ['b|Bronx', { source: 'b', id: 'Bronx', fill: '#ffffff' }],
    ['b|Brooklyn', { source: 'b', id: 'Brooklyn', fill: null }],
  ])
  const from = new Map<string, string | null>([['b|Queens', '#000000'], ['b|Brooklyn', '#000000']])

  it('moves each colour from where it was towards its new colour', () => {
    expect(fillsAt(from, to, 0.5).find((f) => f.id === 'Queens')?.fill).toBe('#808080')
  })

  it('sets colours with nothing to come from, and uncoloured ones, straight away', () => {
    const halfway = fillsAt(from, to, 0.5)
    expect(halfway.find((f) => f.id === 'Bronx')?.fill).toBe('#ffffff')
    expect(halfway.find((f) => f.id === 'Brooklyn')?.fill).toBeNull()
  })

  it('ends exactly on the new colours', () => {
    expect(fillsAt(from, to, 1).map((f) => f.fill)).toEqual(['#ffffff', '#ffffff', null])
  })
})
