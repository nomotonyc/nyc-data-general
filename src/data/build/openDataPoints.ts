import type { Geography } from '../../domain/geography'
import type { OpenDataPointsBuild } from '../../layers'
import type { CountRow } from './openDataCounts'

type Ring = number[][]
/** Precinct or battalion shapes: each feature carries its number under `precinct` or `battalion`. */
export type AreaShapes = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { precinct?: number; battalion?: number }; geometry: { type: 'MultiPolygon'; coordinates: Ring[][] } }[]
}
export type PrecinctShapes = AreaShapes

/** The feature property holding each geography's area number. */
export const NUMBER_PROPERTY = { precincts: 'precinct', battalions: 'battalion' } as const satisfies Record<Geography, string>

/** One fetched record: when, where (as the API returns numbers, text) and its breakdown part. */
export type PointRow = { date: string; lat?: string; lon?: string; part: string }

const API = 'https://data.cityofnewyork.us/resource'
const stamp = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`

/** The SoQL request for one month of matching records, with their coordinates and part. */
export function pointsQuery(build: OpenDataPointsBuild, period: { year: number; month: number }): string {
  const url = new URL(`${API}/${build.dataset}.json`)
  const d = build.dateField
  const { year, month } = period
  const end = month === 11 ? stamp(year + 1, 0) : stamp(year, month + 1)
  url.searchParams.set('$select', `${d} as date, ${build.latitudeField} as lat, ${build.longitudeField} as lon, ${build.partField} as part`)
  url.searchParams.set('$where', `(${build.where}) AND ${d} >= '${stamp(year, month)}' AND ${d} < '${end}'`)
  url.searchParams.set('$limit', '100000')
  return url.toString()
}

/** Ray casting: whether (x, y) is inside the ring. */
export function inRing(ring: Ring, x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** The number of the area containing a point (longitude, latitude), or null in water or outside the city. */
export function areaNumberAt(shapes: AreaShapes, lon: number, lat: number, geography: Geography): number | null {
  for (const f of shapes.features) {
    for (const [outer, ...holes] of f.geometry.coordinates) {
      if (inRing(outer, lon, lat) && !holes.some((h) => inRing(h, lon, lat))) return f.properties[NUMBER_PROPERTY[geography]] ?? null
    }
  }
  return null
}

/** The precinct containing a point (longitude, latitude), or null in water or outside the city. */
export function precinctAt(shapes: PrecinctShapes, lon: number, lat: number): number | null {
  return areaNumberAt(shapes, lon, lat, 'precincts')
}

/**
 * One count per record, in the precinct (or battalion) its coordinates fall in. Records
 * without coordinates, at 0,0, or outside every area get none (and are reported).
 */
export function pointsToCountRows(rows: readonly PointRow[], shapes: AreaShapes, geography: Geography = 'precincts'): CountRow[] {
  return rows.map((r) => {
    const lat = Number(r.lat)
    const lon = Number(r.lon)
    const located = r.lat !== undefined && r.lon !== undefined && lat !== 0 && lon !== 0
    const n = located ? areaNumberAt(shapes, lon, lat, geography) : null
    const area = n === null ? undefined : String(n)
    const row = { month: r.date, part: r.part, n: '1' }
    return geography === 'battalions' ? { battalion: area, ...row } : { precinct: area, ...row }
  })
}
