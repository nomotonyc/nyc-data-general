import { describe, expect, it } from 'vitest'
import { areaOfPrecinct } from '../domain/geography'
import { getStory, type Metric } from '../domain/stories'
import type { StoryDataset } from './dataset'
import {
  areaValue,
  breakdownShares,
  effectiveRange,
  periodIndices,
  rankOf,
  series,
} from './selectors'
import { generateSampleDataset } from './sample'

const source = { name: 's', publisher: 'p', url: 'https://example.org', used: 'u' }
const count: Metric = { id: 'n', label: 'N', note: '', unit: 'fires', aggregation: 'sum', sources: [source], method: ['m'] }
const density: Metric = { id: 'd', label: 'D', note: '', unit: 'people per sq mi', aggregation: 'ratio', sources: [source], method: ['m'] }

const area = (id: string, precincts: number[]) => ({ id, label: id, borough: 'Queens' as const, precincts })

// Two areas; two months in 2023 and two in 2024 (real monthly data has twelve a year).
const monthly: StoryDataset = {
  storyId: 'fire',
  isSample: true,
  periods: [
    { year: 2023, month: 0 },
    { year: 2023, month: 1 },
    { year: 2024, month: 0 },
    { year: 2024, month: 1 },
  ],
  // b stands for two precincts that can't be told apart, like 105 & 116.
  areas: [area('a', [1]), area('b', [5, 6])],
  values: {
    n: { a: [1, 2, 3, 4], b: [10, 20, 30, 40] },
    d: { a: [10, 20, 30, 40], b: [50, 50, 50, 50] },
  },
  denominators: {
    d: { a: [1, 1, 2, 2], b: [10, 10, 10, 10] },
  },
  parts: {
    a: [[1, 0], [1, 0], [2, 1], [0, 1]],
    b: [[0, 0], [0, 0], [3, 3], [0, 0]],
  },
}

const yearly: StoryDataset = {
  ...monthly,
  periods: ([2021, 2022, 2023, 2024] as const).map((year) => ({ year, month: null })),
}

const y2024 = { from: 2024, to: 2024 } as const
const both = { from: 2023, to: 2024 } as const

describe('effectiveRange', () => {
  it('keeps a range the data covers', () => {
    expect(effectiveRange(yearly, { from: 2021, to: 2024 })).toEqual({ range: { from: 2021, to: 2024 }, adjusted: false })
  })

  it('trims a range that overlaps the data', () => {
    expect(effectiveRange(yearly, { from: 2019, to: 2022 })).toEqual({ range: { from: 2021, to: 2022 }, adjusted: true })
  })

  it('uses the first year for a range entirely before the data', () => {
    expect(effectiveRange(yearly, { from: 2019, to: 2020 })).toEqual({ range: { from: 2021, to: 2021 }, adjusted: true })
  })

  it('uses the latest year for a range entirely after the data', () => {
    expect(effectiveRange(yearly, { from: 2025, to: 2026 })).toEqual({ range: { from: 2024, to: 2024 }, adjusted: true })
  })
})

describe('periodIndices', () => {
  it('selects the periods inside the range', () => {
    expect(periodIndices(monthly, y2024)).toEqual([2, 3])
    expect(periodIndices(monthly, both)).toEqual([0, 1, 2, 3])
  })
})

describe('areaValue', () => {
  it('adds up counts across periods', () => {
    expect(areaValue(monthly, count, ['a'], y2024)).toBe(7)
    expect(areaValue(monthly, count, ['a'], both)).toBe(10)
  })

  it('adds up counts across areas', () => {
    expect(areaValue(monthly, count, ['a', 'b'], y2024)).toBe(77)
  })

  it('divides total numerator by total denominator for ratios', () => {
    expect(areaValue(monthly, density, ['a'], y2024)).toBe(70 / 4)
    expect(areaValue(monthly, density, ['a'], both)).toBe(100 / 6)
  })

  it('does not average ratios across areas', () => {
    // mean of the two densities would be (17.5 + 5) / 2 = 11.25
    expect(areaValue(monthly, density, ['a', 'b'], y2024)).toBe(170 / 24)
  })

  it('names the area when the dataset has no values for it', () => {
    expect(() => areaValue(monthly, count, ['c'], y2024)).toThrow(/area c/)
  })

  it('names the layer when the dataset has no values for it', () => {
    expect(() => areaValue(monthly, { ...count, id: 'missing' }, ['a'], y2024)).toThrow(/missing/)
  })
})

describe('rankOf', () => {
  it('ranks 1 for the highest and shares ranks on ties', () => {
    expect(rankOf(9, [9, 5, 3])).toBe(1)
    expect(rankOf(3, [9, 5, 3])).toBe(3)
    expect(rankOf(5, [9, 5, 5, 3])).toBe(2)
  })
})

describe('series', () => {
  it('sums counts across areas each period', () => {
    expect(series(monthly, count, ['a', 'b'], y2024)).toEqual([33, 44])
  })

  it('can express counts per precinct so places of different sizes compare', () => {
    // three precincts between the two areas
    expect(series(monthly, count, ['a', 'b'], y2024, true)).toEqual([33 / 3, 44 / 3])
  })

  it('computes ratios from totals each period', () => {
    expect(series(monthly, density, ['a', 'b'], both)).toEqual([60 / 11, 70 / 11, 80 / 12, 90 / 12])
  })
})

describe('breakdownShares', () => {
  it('returns each part’s share of the total for the range', () => {
    // 2024: part 0 = 2+0+3+0 = 5, part 1 = 1+1+3+0 = 5
    expect(breakdownShares(monthly, ['a', 'b'], y2024)).toEqual([0.5, 0.5])
    // both years add part 0 = 2 more
    expect(breakdownShares(monthly, ['a', 'b'], both)).toEqual([7 / 12, 5 / 12])
  })

  it('returns zeros rather than NaN when nothing was recorded', () => {
    expect(breakdownShares(monthly, ['b'], { from: 2023, to: 2023 })).toEqual([0, 0])
  })
})

describe('ranges with no data', () => {
  const outside = { from: 2025, to: 2026 } as const

  it('refuses instead of returning zeros', () => {
    expect(() => areaValue(yearly, count, ['a'], outside)).toThrow(/fire has no data for 2025–2026/)
    expect(() => series(yearly, count, ['a'], outside)).toThrow(/no data for 2025–2026/)
    expect(() => breakdownShares(yearly, ['a'], outside)).toThrow(/no data for 2025–2026/)
  })

  it('works once the range goes through effectiveRange', () => {
    expect(areaValue(yearly, count, ['a'], effectiveRange(yearly, outside).range)).toBe(4)
  })
})

describe('zero denominators', () => {
  it('refuses instead of reporting a density of 0', () => {
    const noLand = { ...monthly, denominators: { d: { a: [0, 0, 0, 0], b: [10, 10, 10, 10] } } }
    expect(() => areaValue(noLand, density, ['a'], y2024)).toThrow(/d denominator is 0 for a/)
    expect(() => series(noLand, density, ['a'], y2024)).toThrow(/d denominator is 0 for a/)
  })
})

describe('precincts 105 and 116 in dispatch data', () => {
  const ds = generateSampleDataset(getStory('fire'))
  const fires = getStory('fire').metrics[0]
  const range = { from: 2025, to: 2025 } as const

  it('has no separate values for either precinct', () => {
    expect(() => areaValue(ds, fires, ['105'], range)).toThrow(/area 105/)
    expect(() => areaValue(ds, fires, ['116'], range)).toThrow(/area 116/)
  })

  it('resolves both precincts to the one merged area', () => {
    expect(areaOfPrecinct(ds.areas, 105).id).toBe('105+116')
    expect(areaOfPrecinct(ds.areas, 116).id).toBe('105+116')
  })

  it('ranks the merged area once among 77', () => {
    const values = ds.areas.map((a) => areaValue(ds, fires, [a.id], range))
    expect(values).toHaveLength(77)
    const merged = areaValue(ds, fires, ['105+116'], range)
    expect(rankOf(merged, values)).toBeLessThanOrEqual(77)
    expect(values.filter((v) => v === merged)).toHaveLength(1)
  })
})
