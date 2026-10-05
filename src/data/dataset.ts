import type { Area, Geography } from '../domain/geography'
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
  /** Which areas the values are reported for. */
  geography: Geography
  /** True while the story is served by generated values. */
  isSample: boolean
  /** When real data was built (ISO timestamp); null for sample data. */
  asOf: string | null
  /** For areas the source doesn't record (battalions), how records were placed; null otherwise. */
  placement: readonly Placement[] | null
  /** Every period covered, oldest first. */
  periods: readonly Period[]
  /** The geography's areas (areasOf). */
  areas: readonly Area[]
  /** metricId -> areaId -> one value per period. For ratio layers, the numerator. */
  values: Readonly<Record<string, ByArea>>
  /** Ratio layers only: metricId -> areaId -> one denominator per period. */
  denominators: Readonly<Record<string, ByArea>>
  /** areaId -> one entry per period -> one count per breakdown part. */
  parts: Readonly<Record<string, readonly (readonly number[])[]>>
}

/** How a battalion file's records were placed: by what, what share of them, and whether that is exact. */
export type Placement = { method: string; share: number; exact: boolean }

export type YearRange = { from: Year; to: Year }
