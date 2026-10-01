import { describe, expect, it } from 'vitest'
import { getLayer } from '../layers'
import { layerPeriods } from './coverage'

describe('layerPeriods', () => {
  it('runs monthly layers from January of the first year to June of the final year', () => {
    const periods = layerPeriods(getLayer('structural-fires'))
    expect(periods).toHaveLength(7 * 12 + 6)
    expect(periods[0]).toEqual({ year: 2019, month: 0 })
    expect(periods.at(-1)).toEqual({ year: 2026, month: 5 })
  })

  it('gives yearly layers one period a year', () => {
    expect(layerPeriods(getLayer('population-density')).map((p) => p.year)).toEqual([2021, 2022, 2023, 2024])
  })
})
