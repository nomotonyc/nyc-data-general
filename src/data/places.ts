import { BATTALIONS, BOROUGHS, type Borough } from '../domain/geography'
import type { Metric } from '../layers'
import type { LayerDataset, YearRange } from './dataset'
import { areaValue, effectiveRange } from './selectors'

/** The dataset's areas in a borough, or every area for null (the whole city). */
export function areaIdsIn(ds: LayerDataset, borough: Borough | null): string[] {
  // Divisions 6, 7 and 8 cross borough lines. Their files retain the source battalion rows so
  // borough totals can use each battalion's actual borough without double-counting a division.
  if (ds.geography === 'divisions' && borough !== null) {
    return BATTALIONS.filter((battalion) => battalion.borough === borough).map((battalion) => `bn${battalion.number}`)
  }
  return ds.areas.filter((a) => borough === null || a.borough === borough).map((a) => a.id)
}

export type PlaceValues = {
  city: number
  boroughs: Record<Borough, number>
  /** The years actually used; differs from the request when `adjusted`. */
  range: YearRange
  adjusted: boolean
}

export function placeValues(ds: LayerDataset, metric: Metric, requested: YearRange): PlaceValues {
  const { range, adjusted } = effectiveRange(ds, requested)
  const boroughs = Object.fromEntries(
    BOROUGHS.map((b) => [b, areaValue(ds, metric, areaIdsIn(ds, b), range)]),
  ) as Record<Borough, number>
  return { city: areaValue(ds, metric, areaIdsIn(ds, null), range), boroughs, range, adjusted }
}
