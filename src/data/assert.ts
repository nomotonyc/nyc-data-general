import type { Metric } from '../layers'
import type { LayerDataset } from './dataset'

/**
 * Throws, naming the layer, area and period, unless `ds` is complete for
 * `layer`. Run it on every dataset before use, so a gap fails at load instead
 * of reaching the map as NaN.
 */
export function assertDataset(ds: LayerDataset, layer: Metric): void {
  function fail(problem: string): never {
    throw new Error(`Dataset ${ds.layerId}: ${problem}`)
  }

  if (ds.layerId !== layer.id) fail(`expected layer ${layer.id}`)
  const length = ds.periods.length
  if (length === 0) fail('has no periods')

  function checkSeries(what: string, areaId: string, values: readonly number[] | undefined, positive: boolean) {
    if (!values) fail(`${what} has no values for area ${areaId}`)
    if (values.length !== length) fail(`${what} for area ${areaId} has length ${values.length}, expected ${length}`)
    values.forEach((v, i) => {
      if (!Number.isFinite(v) || v < 0 || (positive && v === 0)) fail(`${what} for area ${areaId} has ${v} at period ${i}`)
    })
  }

  const values = ds.values[layer.id]
  if (!values) fail(`has no layer ${layer.id}`)
  const denominators = ds.denominators[layer.id]
  if (layer.aggregation === 'ratio' && !denominators) fail(`has no denominators for ratio layer ${layer.id}`)
  for (const area of ds.areas) {
    checkSeries(layer.id, area.id, values[area.id], false)
    if (layer.aggregation === 'ratio') checkSeries(`${layer.id} denominator`, area.id, denominators[area.id], true)
  }

  const width = layer.breakdown.parts.length
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
