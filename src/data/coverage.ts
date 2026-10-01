import { FINAL_YEAR, FINAL_YEAR_LAST_MONTH, YEARS } from '../domain/stories'
import type { Metric } from '../layers'
import type { Period } from './dataset'

/** Every period a layer covers, oldest first: months to June of the final year, or whole years. */
export function layerPeriods(layer: Metric): Period[] {
  const { resolution, firstYear, lastYear } = layer.data
  const years = YEARS.filter((y) => y >= firstYear && y <= lastYear)
  if (resolution === 'year') return years.map((year) => ({ year, month: null }))
  return years.flatMap((year) =>
    Array.from({ length: year === FINAL_YEAR ? FINAL_YEAR_LAST_MONTH + 1 : 12 }, (_, month) => ({ year, month })),
  )
}

/** "2025-03" for a month, "2025" for a year. */
export function periodKey(p: Period): string {
  return p.month === null ? String(p.year) : `${p.year}-${String(p.month + 1).padStart(2, '0')}`
}
