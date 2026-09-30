import { describe, expect, it } from 'vitest'
import { LAYERS, getLayer } from '../layers'
import { generateSampleDataset } from './sample'

describe('generateSampleDataset', () => {
  it('is deterministic', () => {
    expect(generateSampleDataset(getLayer('structural-fires'))).toEqual(generateSampleDataset(getLayer('structural-fires')))
  })

  it('is marked as sample data, for its layer', () => {
    const ds = generateSampleDataset(getLayer('structural-fires'))
    expect(ds.isSample).toBe(true)
    expect(ds.layerId).toBe('structural-fires')
  })

  it.each(['structural-fires', 'ems-calls'])('gives %s every month from January 2019 to June 2026', (id) => {
    const { periods } = generateSampleDataset(getLayer(id))
    expect(periods).toHaveLength(7 * 12 + 6)
    expect(periods[0]).toEqual({ year: 2019, month: 0 })
    expect(periods[periods.length - 1]).toEqual({ year: 2026, month: 5 })
  })

  it('gives density one period per ACS year, 2021 to 2024', () => {
    expect(generateSampleDataset(getLayer('population-density')).periods).toEqual([
      { year: 2021, month: null },
      { year: 2022, month: null },
      { year: 2023, month: null },
      { year: 2024, month: null },
    ])
  })

  it('uses merged dispatch areas for fire and EMS, and every precinct for density', () => {
    expect(generateSampleDataset(getLayer('structural-fires')).areas.map((a) => a.id)).toContain('105+116')
    expect(generateSampleDataset(getLayer('structural-fires')).areas).toHaveLength(77)
    expect(generateSampleDataset(getLayer('population-density')).areas).toHaveLength(78)
  })

  it.each(LAYERS.map((l) => [l.id, l] as const))('gives %s a finite, non-negative value for every area and period', (_, layer) => {
    const ds = generateSampleDataset(layer)
    for (const area of ds.areas) {
      const values = ds.values[layer.id][area.id]
      expect(values, area.id).toHaveLength(ds.periods.length)
      for (const v of values) expect(Number.isFinite(v) && v >= 0, `${area.id} ${v}`).toBe(true)
      if (layer.aggregation === 'ratio') {
        for (const d of ds.denominators[layer.id][area.id]) expect(d, area.id).toBeGreaterThan(0)
      }
    }
  })

  it.each(LAYERS.map((l) => [l.id, l] as const))('gives %s one breakdown count per part for every area and period', (_, layer) => {
    const ds = generateSampleDataset(layer)
    for (const area of ds.areas) {
      expect(ds.parts[area.id]).toHaveLength(ds.periods.length)
      for (const period of ds.parts[area.id]) expect(period).toHaveLength(layer.breakdown.parts.length)
    }
  })

  it('uses the range set in the layer file', () => {
    const layer = getLayer('structural-fires')
    const ds = generateSampleDataset(layer)
    const yearly = ds.periods.map((_, i) => ds.areas.reduce((a, area) => a + ds.values[layer.id][area.id][i], 0))
    // Per area per year stays within the layer's range, allowing for noise, drift and season.
    const perAreaYear = (yearly.reduce((a, b) => a + b, 0) / (ds.periods.length / 12)) / ds.areas.length
    expect(perAreaYear).toBeGreaterThan(layer.sample.lo * 0.5)
    expect(perAreaYear).toBeLessThan(layer.sample.hi * 1.5)
  })
})
