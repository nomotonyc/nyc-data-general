import { areasOf, dispatchPrecinct, isPrecinct, type Geography } from '../../domain/geography'
import type { Metric, OpenDataCountsBuild } from '../../layers'
import { layerPeriods, periodKey } from '../coverage'
import type { LayerFile } from '../file'

/** One row of the grouped API response. `precinct` and `zip` are missing for records without them. */
/** `battalion` replaces `precinct` in rows placed in battalions by the build itself. */
export type CountRow = { precinct?: string; battalion?: string; zip?: string; cd?: string; cc?: string; month: string; part: string; n: string; total?: string }

export type YearReport = { year: number; counted: number; noPrecinct: number }

const API = 'https://data.cityofnewyork.us/resource'

const stamp = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`

/**
 * The SoQL request for one month of a layer's records, grouped by precinct, ZIP code, month and
 * part. One month at a time keeps each aggregation well inside the API's response time.
 */
export function countQuery(build: OpenDataCountsBuild, period: { year: number; month: number }): string {
  const url = new URL(`${API}/${build.dataset}.json`)
  const d = build.dateField
  const { year, month } = period
  const end = month === 11 ? stamp(year + 1, 0) : stamp(year, month + 1)
  const sum = build.sumField ? `, sum(${build.sumField}) as total` : ''
  const districts = build.districtFields ? `${build.districtFields.community} as cd, ${build.districtFields.council} as cc, ` : ''
  url.searchParams.set(
    '$select',
    `${build.precinctField} as precinct, ${build.zipField} as zip, ${districts}date_trunc_ym(${d}) as month, ${build.partField} as part, count(*) as n${sum}`,
  )
  url.searchParams.set('$where', `(${build.where}) AND ${d} >= '${stamp(year, month)}' AND ${d} < '${end}'`)
  url.searchParams.set('$group', build.districtFields ? 'precinct, zip, cd, cc, month, part' : 'precinct, zip, month, part')
  url.searchParams.set('$limit', '100000')
  return url.toString()
}

/**
 * Counts by precinct, month and breakdown part, telling 105 and 116 apart by ZIP code.
 * Every raw part value must be listed in the layer's build config and every precinct must exist; records with no precinct are left
 * out and reported. Months after the layer's last period are ignored.
 */
export function aggregateCounts(
  layer: Metric,
  rows: readonly CountRow[],
  geography: Geography = 'precincts',
): { file: LayerFile; report: YearReport[] } {
  const build = layer.build
  if (!build || build.kind === 'census-density') throw new Error(`Layer ${layer.id} is not built from Open Data records`)

  const periods = layerPeriods(layer)
  const periodIndex = new Map(periods.map((p, i) => [periodKey(p), i]))
  const areas = areasOf(geography)
  const areaOf = new Map(areas.map((a) => [a.number, a.id]))
  const partOf = new Map(Object.values(build.parts).flatMap((values, i) => values.map((v) => [v, i])))
  const width = layer.breakdown.parts.length

  const ratio = build.sumField !== undefined
  const values: Record<string, number[]> = {}
  const denominators: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const a of areas) {
    values[a.id] = periods.map(() => 0)
    if (ratio) denominators[a.id] = periods.map(() => 0)
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
    const placed = geography === 'battalions' ? row.battalion : row.precinct
    if (placed === undefined || placed === '') {
      year.noPrecinct += n
      continue
    }
    const area = geography === 'battalions' ? areaOf.get(Number(placed)) : areaOf.get(dispatchPrecinct(placed, row.zip))
    if (geography === 'battalions' && !area) throw new Error(`${layer.id}: battalion "${placed}" is not an FDNY battalion`)
    if (!area || (geography === 'precincts' && !isPrecinct(Number(placed)))) throw new Error(`${layer.id}: precinct "${placed}" is not an NYPD precinct`)
    if (ratio) {
      values[area][period] += Number(row.total)
      denominators[area][period] += n
    } else {
      values[area][period] += n
    }
    parts[area][period][part] += n
    year.counted += n
  }

  // Records split across battalions by estimate leave fractions; three decimals keep files small.
  const tidy = (rows: Record<string, number[]>) => {
    for (const id in rows) rows[id] = rows[id].map((v) => Math.round(v * 1000) / 1000)
  }
  tidy(values)
  if (ratio) tidy(denominators)
  for (const id in parts) parts[id] = parts[id].map((counts) => counts.map((v) => Math.round(v * 1000) / 1000))
  return {
    file: {
      layerId: layer.id,
      ...(geography === 'precincts' ? {} : { geography }),
      // Rows reaching a battalion here were placed by the build from each record's coordinates.
      ...(geography === 'battalions' && build.kind === 'open-data-points'
        ? { placement: [{ method: `each ${build.record}’s coordinates`, share: 1, exact: true }] }
        : {}),
      built: new Date().toISOString(),
      from: periodKey(periods[0]),
      to: periodKey(periods[periods.length - 1]),
      values,
      ...(ratio ? { denominators } : {}),
      parts,
    },
    report: [...report.values()],
  }
}
