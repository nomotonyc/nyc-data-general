import { BOROUGHS, type Borough } from '../domain/geography'
import type { Metric } from '../domain/stories'
import type { StoryDataset, YearRange } from './dataset'
import { areaValue, effectiveRange } from './selectors'

/** The dataset's areas in a borough, or every area for null (the whole city). */
export function areaIdsIn(ds: StoryDataset, borough: Borough | null): string[] {
  return ds.areas.filter((a) => borough === null || a.borough === borough).map((a) => a.id)
}

export type PlaceValues = {
  city: number
  boroughs: Record<Borough, number>
  /** The years actually used; differs from the request when `adjusted`. */
  range: YearRange
  adjusted: boolean
}

export function placeValues(ds: StoryDataset, metric: Metric, requested: YearRange): PlaceValues {
  const { range, adjusted } = effectiveRange(ds, requested)
  const boroughs = Object.fromEntries(
    BOROUGHS.map((b) => [b, areaValue(ds, metric, areaIdsIn(ds, b), range)]),
  ) as Record<Borough, number>
  return { city: areaValue(ds, metric, areaIdsIn(ds, null), range), boroughs, range, adjusted }
}
