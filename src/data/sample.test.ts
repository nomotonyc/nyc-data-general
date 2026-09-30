import { describe, expect, it } from 'vitest'
import { STORIES, getStory } from '../domain/stories'
import { generateSampleDataset } from './sample'

describe('generateSampleDataset', () => {
  it('is deterministic', () => {
    expect(generateSampleDataset(getStory('fire'))).toEqual(generateSampleDataset(getStory('fire')))
  })

  it('is marked as sample data', () => {
    expect(generateSampleDataset(getStory('fire')).isSample).toBe(true)
  })

  it.each(['fire', 'medical'] as const)('gives %s every month from January 2019 to June 2026', (id) => {
    const { periods } = generateSampleDataset(getStory(id))
    expect(periods).toHaveLength(7 * 12 + 6)
    expect(periods[0]).toEqual({ year: 2019, month: 0 })
    expect(periods[periods.length - 1]).toEqual({ year: 2026, month: 5 })
  })

  it('gives density one period per ACS year, 2021 to 2024', () => {
    expect(generateSampleDataset(getStory('demographic')).periods).toEqual([
      { year: 2021, month: null },
      { year: 2022, month: null },
      { year: 2023, month: null },
      { year: 2024, month: null },
    ])
  })

  it('uses merged dispatch areas for fire and EMS, and every precinct for density', () => {
    expect(generateSampleDataset(getStory('fire')).areas.map((a) => a.id)).toContain('105+116')
    expect(generateSampleDataset(getStory('fire')).areas).toHaveLength(77)
    expect(generateSampleDataset(getStory('demographic')).areas).toHaveLength(78)
  })

  it.each(STORIES.map((s) => [s.id, s] as const))(
    'gives %s a finite, non-negative value for every layer, area and period',
    (_, story) => {
      const ds = generateSampleDataset(story)
      for (const metric of story.metrics) {
        for (const area of ds.areas) {
          const values = ds.values[metric.id][area.id]
          expect(values, `${metric.id} ${area.id}`).toHaveLength(ds.periods.length)
          for (const v of values) expect(Number.isFinite(v) && v >= 0, `${metric.id} ${area.id} ${v}`).toBe(true)
          if (metric.aggregation === 'ratio') {
            for (const d of ds.denominators[metric.id][area.id]) expect(d, `${metric.id} ${area.id}`).toBeGreaterThan(0)
          }
        }
      }
    },
  )

  it.each(STORIES.map((s) => [s.id, s] as const))(
    'gives %s one breakdown count per part for every area and period',
    (_, story) => {
      const ds = generateSampleDataset(story)
      for (const area of ds.areas) {
        expect(ds.parts[area.id]).toHaveLength(ds.periods.length)
        for (const period of ds.parts[area.id]) expect(period).toHaveLength(story.breakdown.parts.length)
      }
    },
  )
})
