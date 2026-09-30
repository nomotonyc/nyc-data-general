import { BOROUGHS, DISPATCH_AREAS, PRECINCT_AREAS } from '../domain/geography'
import { FINAL_YEAR_LAST_MONTH, STORIES, YEARS, type Story, type StoryId } from '../domain/stories'
import { assertDataset } from './assert'
import type { Period, StoryDataset } from './dataset'

/** Yearly magnitude of each layer per area, low to high. Densities are people per sq mi. */
const RANGES: Record<string, readonly [number, number]> = {
  'population-density': [5000, 120000],
  'structural-fires': [30, 700],
  'ems-calls': [600, 50000],
}

/** Seasonal swing and peak month (0 = January) for monthly stories. */
const SEASON: Record<StoryId, readonly [amplitude: number, peak: number]> = {
  demographic: [0, 0],
  fire: [0.22, 0],
  medical: [0.12, 6],
}

/** Deterministic pseudo-random number in [0, 1). */
function rnd(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const FINAL_YEAR = YEARS[YEARS.length - 1]

function periodsFor(story: Story): Period[] {
  const { resolution, firstYear, lastYear } = story.data
  const years = YEARS.filter((y) => y >= firstYear && y <= lastYear)
  if (resolution === 'year') return years.map((year) => ({ year, month: null }))
  return years.flatMap((year) =>
    Array.from({ length: year === FINAL_YEAR ? FINAL_YEAR_LAST_MONTH + 1 : 12 }, (_, month) => ({ year, month })),
  )
}

/** Clearly synthetic values in the shape real data will take. */
export function generateSampleDataset(story: Story): StoryDataset {
  const storyIndex = STORIES.findIndex((s) => s.id === story.id)
  const [amplitude, peak] = SEASON[story.id]
  const periods = periodsFor(story)
  const areas = story.data.areas === 'dispatch' ? DISPATCH_AREAS : PRECINCT_AREAS

  const values: Record<string, Record<string, number[]>> = {}
  const denominators: Record<string, Record<string, number[]>> = {}
  story.metrics.forEach((metric, metricIndex) => {
    const [lo, hi] = RANGES[metric.id]
    const key = storyIndex * 10 + metricIndex
    values[metric.id] = {}
    if (metric.aggregation === 'ratio') denominators[metric.id] = {}
    for (const area of areas) {
      const seed = area.precincts[0]
      // Mostly a per-borough level, so neighbouring areas look related.
      const level = 0.6 * rnd(BOROUGHS.indexOf(area.borough) + 1, key + 3) + 0.4 * rnd(seed, key + 7)
      const land = 0.8 + 15 * rnd(seed, 99)
      values[metric.id][area.id] = periods.map(({ year, month }) => {
        const drift = 1 + (YEARS.indexOf(year) - (YEARS.length - 1)) * 0.03 * (rnd(key, 9) - 0.35)
        const season = month === null ? 1 : 1 + amplitude * Math.cos((2 * Math.PI * (month - peak)) / 12)
        const noise = 1 + (rnd(seed * 13 + (month ?? 0), year + metricIndex) - 0.5) * 0.16
        const yearly = (lo + (hi - lo) * level) * drift * season * noise
        if (metric.aggregation === 'ratio') return yearly * land
        return month === null ? yearly : yearly / 12
      })
      if (metric.aggregation === 'ratio') denominators[metric.id][area.id] = periods.map(() => land)
    }
  })

  const parts: Record<string, number[][]> = {}
  for (const area of areas) {
    const seed = area.precincts[0]
    parts[area.id] = periods.map(({ year, month }) =>
      story.breakdown.parts.map((_, part) => {
        const last = part === story.breakdown.parts.length - 1
        const weight = 0.4 + rnd(seed + storyIndex * 17, part + 1) * (last ? 0.5 : 1.2)
        return Math.round(10 * weight * (1 + (rnd(seed + (month ?? 0), year + part) - 0.5) * 0.3))
      }),
    )
  }

  const ds: StoryDataset = { storyId: story.id, isSample: true, periods, areas, values, denominators, parts }
  assertDataset(ds, story)
  return ds
}
