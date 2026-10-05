import type { Metric } from '../layers'
import { assertDataset } from './assert'
import { areasOf, type Geography } from '../domain/geography'
import { layerPeriods, periodKey } from './coverage'
import type { LayerDataset, Placement } from './dataset'

/** A built layer as stored in public/data/layers/<id>.json. Periods are the layer's, from `from` to `to`. */
export type LayerFile = {
  layerId: string
  /** Precincts when omitted. */
  geography?: Geography
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
  /** Battalion files: how records were placed (shares add to 1). */
  placement?: Placement[]
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
  const geography = file.geography ?? 'precincts'
  if (file.placement) {
    const total = file.placement.reduce((s, p) => s + p.share, 0)
    if (Math.abs(total - 1) > 0.001) throw new Error(`Dataset ${layer.id}: placement shares add to ${Math.round(total * 100)}%`)
  }
  const all = areasOf(geography)
  const areas = areaIds ? all.filter((a) => areaIds.includes(a.id)) : all
  const ds: LayerDataset = {
    layerId: layer.id,
    geography,
    isSample: false,
    asOf: file.built,
    placement: file.placement ?? null,
    periods,
    areas,
    values: { [layer.id]: file.values },
    denominators: file.denominators ? { [layer.id]: file.denominators } : {},
    parts: file.parts,
  }
  assertDataset(ds, layer)
  return ds
}
