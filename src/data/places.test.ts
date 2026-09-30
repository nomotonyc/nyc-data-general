import { describe, expect, it } from 'vitest'
import { BOROUGHS } from '../domain/geography'
import { getStory } from '../domain/stories'
import { getDataset } from './load'
import { areaIdsIn, placeValues } from './places'
import { areaValue } from './selectors'

const fire = getDataset('fire')
const density = getDataset('demographic')
const fires = getStory('fire').metrics[0]
const people = getStory('demographic').metrics[0]
const y2025 = { from: 2025, to: 2025 } as const

describe('areaIdsIn', () => {
  it('lists a borough’s areas, merged or not', () => {
    expect(areaIdsIn(fire, 'Queens')).toHaveLength(16)
    expect(areaIdsIn(fire, 'Queens')).toContain('105+116')
    expect(areaIdsIn(density, 'Queens')).toHaveLength(17)
  })

  it('lists every area for the whole city', () => {
    expect(areaIdsIn(fire, null)).toHaveLength(77)
  })
})

describe('placeValues', () => {
  it('adds borough counts up to the city total', () => {
    const v = placeValues(fire, fires, y2025)
    const boroughs = BOROUGHS.reduce((a, b) => a + v.boroughs[b], 0)
    expect(v.city).toBeCloseTo(boroughs, 6)
  })

  it('computes city density from totals, not the mean of borough densities', () => {
    const v = placeValues(density, people, { from: 2024, to: 2024 })
    expect(v.city).toBe(areaValue(density, people, areaIdsIn(density, null), { from: 2024, to: 2024 }))
    const meanOfBoroughs = BOROUGHS.reduce((a, b) => a + v.boroughs[b], 0) / BOROUGHS.length
    expect(v.city).not.toBeCloseTo(meanOfBoroughs, 0)
  })

  it('uses the nearest available years and says so', () => {
    const v = placeValues(density, people, y2025)
    expect(v.range).toEqual({ from: 2024, to: 2024 })
    expect(v.adjusted).toBe(true)
  })

  it('reports no adjustment when the data covers the years', () => {
    expect(placeValues(fire, fires, y2025).adjusted).toBe(false)
  })
})
