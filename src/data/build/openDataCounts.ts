import { PRECINCT_AREAS, dispatchPrecinct, isPrecinct } from '../../domain/geography'
import type { Year } from '../../domain/stories'
import type { Metric, OpenDataCountsBuild } from '../../layers'
import { layerPeriods, periodKey } from '../coverage'
import type { LayerFile } from '../file'

/** One row of the grouped API response. `precinct` and `zip` are missing for records without them. */
export type CountRow = { precinct?: string; zip?: string; month: string; part: string; n: string }

export type YearReport = { year: number; counted: number; noPrecinct: number }

const API = 'https://data.cityofnewyork.us/resource'

/** The SoQL request for one year of a layer's records, grouped by precinct, ZIP code, month and part. */
export function countQuery(build: OpenDataCountsBuild, year: Year): string {
  const url = new URL(`${API}/${build.dataset}.json`)
  const d = build.dateField
  url.searchParams.set('$select', `${build.precinctField} as precinct, ${build.zipField} as zip, date_trunc_ym(${d}) as month, ${build.partField} as part, count(*) as n`)
  url.searchParams.set('$where', `(${build.where}) AND ${d} >= '${year}-01-01T00:00:00' AND ${d} < '${year + 1}-01-01T00:00:00'`)
  url.searchParams.set('$group', 'precinct, zip, month, part')
  url.searchParams.set('$limit', '100000')
  return url.toString()
}

/**
 * Counts by precinct, month and breakdown part, telling 105 and 116 apart by ZIP code.
 * Every raw part value must be listed in the layer's build config and every precinct must exist; records with no precinct are left
 * out and reported. Months after the layer's last period are ignored.
 */
export function aggregateCounts(layer: Metric, rows: readonly CountRow[]): { file: LayerFile; report: YearReport[] } {
  const build = layer.build
  if (build?.kind !== 'open-data-counts') throw new Error(`Layer ${layer.id} is not built from Open Data counts`)

  const periods = layerPeriods(layer)
  const periodIndex = new Map(periods.map((p, i) => [periodKey(p), i]))
  const areas = PRECINCT_AREAS
  const areaOf = new Map(areas.flatMap((a) => a.precincts.map((p) => [p, a.id])))
  const partOf = new Map(Object.values(build.parts).flatMap((values, i) => values.map((v) => [v, i])))
  const width = layer.breakdown.parts.length

  const values: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const a of areas) {
    values[a.id] = periods.map(() => 0)
    parts[a.id] = periods.map(() => Array<number>(width).fill(0))
  }
  const report = new Map([...new Set(periods.map((p) => p.year))].map((y) => [y, { year: y, counted: 0, noPrecinct: 0 }]))

  for (const row of rows) {
    const period = periodIndex.get(row.month.slice(0, 7))
    if (period === undefined) continue
    const year = report.get(periods[period].year)!
    const n = Number(row.n)
    const part = partOf.get(row.part)
    if (part === undefined) throw new Error(`${layer.id}: ${build.partField} "${row.part}" is in no part; add it to the layer's build.parts`)
    if (row.precinct === undefined || row.precinct === '') {
      year.noPrecinct += n
      continue
    }
    const area = areaOf.get(dispatchPrecinct(row.precinct, row.zip))
    if (!area || !isPrecinct(Number(row.precinct))) throw new Error(`${layer.id}: precinct "${row.precinct}" is not an NYPD precinct`)
    values[area][period] += n
    parts[area][period][part] += n
    year.counted += n
  }

  return {
    file: {
      layerId: layer.id,
      built: new Date().toISOString(),
      from: periodKey(periods[0]),
      to: periodKey(periods[periods.length - 1]),
      values,
      parts,
    },
    report: [...report.values()],
  }
}
