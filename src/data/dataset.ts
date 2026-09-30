import type { Area } from '../domain/geography'
import type { Year } from '../domain/stories'

/** A month (0 = January) of a year, or the whole year when month is null. */
export type Period = { year: Year; month: number | null }

type ByArea = Readonly<Record<string, readonly number[]>>

/**
 * Everything one layer needs, area by area and period by period. Real data
 * and the sample generator both produce this shape.
 */
export type LayerDataset = {
  layerId: string
  /** True while the story is served by generated values. */
  isSample: boolean
  /** Every period covered, oldest first. */
  periods: readonly Period[]
  /** The areas values are reported for (see PRECINCT_AREAS, DISPATCH_AREAS). */
  areas: readonly Area[]
  /** metricId -> areaId -> one value per period. For ratio layers, the numerator. */
  values: Readonly<Record<string, ByArea>>
  /** Ratio layers only: metricId -> areaId -> one denominator per period. */
  denominators: Readonly<Record<string, ByArea>>
  /** areaId -> one entry per period -> one count per breakdown part. */
  parts: Readonly<Record<string, readonly (readonly number[])[]>>
}

export type YearRange = { from: Year; to: Year }
