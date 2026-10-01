import type { Metric } from '../layers'
import { assertDataset } from './assert'
import { PRECINCT_AREAS } from '../domain/geography'
import { layerPeriods, periodKey } from './coverage'
import type { LayerDataset } from './dataset'

/** A built layer as stored in public/data/layers/<id>.json. Periods are the layer's, from `from` to `to`. */
export type LayerFile = {
  layerId: string
  /** When the build ran (ISO timestamp). */
  built: string
  /** First and last period: "2019-01" / "2026-06", or "2021" / "2024" for yearly layers. */
  from: string
  to: string
  /** areaId -> one value per period (for ratio layers, the numerator). */
  values: Record<string, number[]>
  /** Ratio layers only: areaId -> one denominator per period. */
  denominators?: Record<string, number[]>
  /** areaId -> per period -> one count per breakdown part. */
  parts: Record<string, number[][]>
}

/** Checks a built file against its layer and turns it into a dataset. Throws naming the layer on any gap. */
export function datasetFromFile(layer: Metric, file: LayerFile, areaIds?: readonly string[]): LayerDataset {
  if (file.layerId !== layer.id) throw new Error(`Dataset ${layer.id}: file is for ${file.layerId}`)
  const periods = layerPeriods(layer)
  const from = periodKey(periods[0])
  const to = periodKey(periods[periods.length - 1])
  if (file.from !== from || file.to !== to) {
    throw new Error(`Dataset ${layer.id} covers ${file.from} to ${file.to}, expected ${from} to ${to}`)
  }
  const areas = areaIds ? PRECINCT_AREAS.filter((a) => areaIds.includes(a.id)) : PRECINCT_AREAS
  const ds: LayerDataset = {
    layerId: layer.id,
    isSample: false,
    asOf: file.built,
    periods,
    areas,
    values: { [layer.id]: file.values },
    denominators: file.denominators ? { [layer.id]: file.denominators } : {},
    parts: file.parts,
  }
  assertDataset(ds, layer)
  return ds
}
