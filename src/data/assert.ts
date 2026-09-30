import type { Story } from '../domain/stories'
import type { StoryDataset } from './dataset'

/**
 * Throws, naming the layer, area and period, unless `ds` is complete for
 * `story`. Run it on every dataset before use, so a gap fails at load instead
 * of reaching the map as NaN.
 */
export function assertDataset(ds: StoryDataset, story: Story): void {
  function fail(problem: string): never {
    throw new Error(`Dataset ${ds.storyId}: ${problem}`)
  }

  if (ds.storyId !== story.id) fail(`expected story ${story.id}`)
  const length = ds.periods.length
  if (length === 0) fail('has no periods')

  function checkSeries(what: string, areaId: string, values: readonly number[] | undefined, positive: boolean) {
    if (!values) fail(`${what} has no values for area ${areaId}`)
    if (values.length !== length) fail(`${what} for area ${areaId} has length ${values.length}, expected ${length}`)
    values.forEach((v, i) => {
      if (!Number.isFinite(v) || v < 0 || (positive && v === 0)) fail(`${what} for area ${areaId} has ${v} at period ${i}`)
    })
  }

  for (const metric of story.metrics) {
    const values = ds.values[metric.id]
    if (!values) fail(`has no layer ${metric.id}`)
    const denominators = ds.denominators[metric.id]
    if (metric.aggregation === 'ratio' && !denominators) fail(`has no denominators for ratio layer ${metric.id}`)
    for (const area of ds.areas) {
      checkSeries(metric.id, area.id, values[area.id], false)
      if (metric.aggregation === 'ratio') checkSeries(`${metric.id} denominator`, area.id, denominators[area.id], true)
    }
  }

  const width = story.breakdown.parts.length
  for (const area of ds.areas) {
    const periods = ds.parts[area.id]
    if (!periods || periods.length !== length) fail(`breakdown for area ${area.id} does not cover every period`)
    periods.forEach((counts, i) => {
      if (counts.length !== width || counts.some((n) => !Number.isFinite(n) || n < 0)) {
        fail(`breakdown for area ${area.id} is malformed at period ${i}`)
      }
    })
  }
}
