import { BOROUGHS, PRECINCT_AREAS } from '../domain/geography'
import { STORIES, YEARS } from '../domain/stories'
import { layersOf, type Metric } from '../layers'
import { assertDataset } from './assert'
import { layerPeriods } from './coverage'
import type { LayerDataset } from './dataset'

/** Deterministic pseudo-random number in [0, 1). */
function rnd(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Clearly synthetic values in the shape real data will take, from the layer's `sample` settings. */
export function generateSampleDataset(layer: Metric): LayerDataset {
  // Seeds from the story's and the layer's positions, so each layer gets its own pattern.
  const storyIndex = STORIES.findIndex((s) => s.id === layer.story)
  const layerIndex = layersOf(layer.story).indexOf(layer)
  const key = storyIndex * 10 + layerIndex
  const { lo, hi, seasonality } = layer.sample
  const amplitude = seasonality?.amplitude ?? 0
  const peak = seasonality?.peakMonth ?? 0
  const periods = layerPeriods(layer)
  const areas = PRECINCT_AREAS
  const ratio = layer.aggregation === 'ratio'

  const byArea: Record<string, number[]> = {}
  const denominatorsByArea: Record<string, number[]> = {}
  for (const area of areas) {
    const seed = area.precincts[0]
    // Mostly a per-borough level, so neighbouring areas look related.
    const level = 0.6 * rnd(BOROUGHS.indexOf(area.borough) + 1, key + 3) + 0.4 * rnd(seed, key + 7)
    const land = 0.8 + 15 * rnd(seed, 99)
    byArea[area.id] = periods.map(({ year, month }) => {
      const drift = 1 + (YEARS.indexOf(year) - (YEARS.length - 1)) * 0.03 * (rnd(key, 9) - 0.35)
      const season = month === null ? 1 : 1 + amplitude * Math.cos((2 * Math.PI * (month - peak)) / 12)
      const noise = 1 + (rnd(seed * 13 + (month ?? 0), year + layerIndex) - 0.5) * 0.16
      const yearly = (lo + (hi - lo) * level) * drift * season * noise
      if (ratio) return yearly * land
      return month === null ? yearly : yearly / 12
    })
    if (ratio) denominatorsByArea[area.id] = periods.map(() => land)
  }

  const parts: Record<string, number[][]> = {}
  const partCount = layer.breakdown.parts.length
  for (const area of areas) {
    const seed = area.precincts[0]
    parts[area.id] = periods.map(({ year, month }) =>
      layer.breakdown.parts.map((_, part) => {
        const last = part === partCount - 1
        const weight = 0.4 + rnd(seed + storyIndex * 17, part + 1) * (last ? 0.5 : 1.2)
        return Math.round(10 * weight * (1 + (rnd(seed + (month ?? 0), year + part) - 0.5) * 0.3))
      }),
    )
  }

  const ds: LayerDataset = {
    layerId: layer.id,
    isSample: true,
    asOf: null,
    periods,
    areas,
    values: { [layer.id]: byArea },
    denominators: ratio ? { [layer.id]: denominatorsByArea } : {},
    parts,
  }
  assertDataset(ds, layer)
  return ds
}
