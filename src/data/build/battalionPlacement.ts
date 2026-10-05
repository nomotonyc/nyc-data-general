import { BATTALIONS, boroughOfPrecinct, dispatchPrecinct } from '../../domain/geography'
import type { OpenDataCountsBuild } from '../../layers'
import type { Placement } from '../dataset'
import type { Block } from './census'
import type { CountRow } from './openDataCounts'
import { areaNumberAt, inRing, type AreaShapes } from './openDataPoints'

/** One group of fire dispatch records: where its alarm box is, plus the precinct and ZIP code recorded. */
export type BoxRow = {
  borough: string
  box: string
  location?: string
  precinct?: string
  zip?: string
  /** Community and council district, when the layer's build asks for them. */
  cd?: string
  cc?: string
  month: string
  part: string
  n: string
  /** Ratio layers: the summed field, split along with the count. */
  total?: string
}

type Point = { lon: number; lat: number }

const BATTALION_BOROUGH = new Map(BATTALIONS.map((b) => [b.number, b.borough]))

const BOROUGH_LETTER: Record<string, string> = {
  MANHATTAN: 'M',
  BRONX: 'X',
  BROOKLYN: 'B',
  QUEENS: 'Q',
  'RICHMOND / STATEN ISLAND': 'R',
}

/** The id the published alarm box list uses: borough letter and four-digit box number ("X0364"). */
export function alarmBoxKey(borough: string, box: string): string | null {
  const letter = BOROUGH_LETTER[borough.trim().toUpperCase()]
  return letter && /^\d+$/.test(box.trim()) ? letter + box.trim().padStart(4, '0') : null
}

/** In-service alarm boxes (NYC Open Data v57i-gtxb) by id. */
export function boxLocations(rows: readonly { borobox: string; latitude?: string; longitude?: string }[]): Map<string, Point> {
  const boxes = new Map<string, Point>()
  for (const r of rows) {
    const lat = Number(r.latitude)
    const lon = Number(r.longitude)
    if (r.latitude && r.longitude && lat !== 0 && lon !== 0) boxes.set(r.borobox, { lon, lat })
  }
  return boxes
}

/** The two streets of a box location ("JAMAICA AVE & 242 ST/NCFD"), without FDNY's suffixes; null if it isn't a corner. */
export function intersectionStreets(location: string): [string, string] | null {
  const streets = location.split('&').map((s) => s.split('/')[0].trim())
  return streets.length === 2 && streets.every(Boolean) ? [streets[0], streets[1]] : null
}

/** How geocoded corners are keyed: borough letter and the two streets. */
export const corneredKey = (borough: string, streets: [string, string]) => `${BOROUGH_LETTER[borough.trim().toUpperCase()] ?? '?'}|${streets[0]}|${streets[1]}`

type Shares = Map<number, number>
export type ResidentWeights = {
  /** "precinct|zip|community district|council district" -> battalion -> share of the area's 2020 residents. */
  byCell: Map<string, Shares>
  /** "precinct|zip" -> battalion -> share of the area's 2020 residents. */
  byPrecinctZip: Map<string, Shares>
  /** precinct -> battalion -> share of its 2020 residents. */
  byPrecinct: Map<number, Shares>
  /** USPS ZIP code -> the ZIP area (MODZCTA) that contains it; identity when absent. */
  zipArea: (zip: string) => string
}

export type ZipShapes = { type: 'FeatureCollection'; features: { properties: { zip?: string }; geometry: { coordinates: number[][][][] } }[] }
/** Community or council districts, each feature's code in `district` ("305", "42"). */
export type DistrictShapes = { type: 'FeatureCollection'; features: { properties: { district?: string }; geometry: { coordinates: number[][][][] } }[] }

function codeAt<K extends string>(shapes: { features: { properties: Partial<Record<K, string>>; geometry: { coordinates: number[][][][] } }[] }, key: K, lon: number, lat: number): string | null {
  for (const f of shapes.features) {
    for (const [outer, ...holes] of f.geometry.coordinates) {
      if (inRing(outer, lon, lat) && !holes.some((h) => inRing(h, lon, lat))) return f.properties[key] ?? null
    }
  }
  return null
}

const toShares = (counts: Map<number, number>): Shares => {
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return new Map([...counts].map(([k, v]) => [k, v / total]))
}

/**
 * Where 2020 residents live, by precinct and ZIP area and by battalion: the basis for
 * estimating a record's battalion when only its precinct and ZIP code are known.
 */
export function residentWeights(
  blocks: readonly Block[],
  shapes: { precincts: AreaShapes; battalions: AreaShapes; zips: ZipShapes; community?: DistrictShapes; council?: DistrictShapes },
  zipAliases: ReadonlyMap<string, string> = new Map(),
): ResidentWeights {
  const fine = new Map<string, Map<number, number>>()
  const cell = new Map<string, Map<number, number>>()
  const precinct = new Map<number, Map<number, number>>()
  const add = <K>(m: Map<K, Map<number, number>>, k: K, b: number, n: number) => {
    const inner = m.get(k) ?? new Map<number, number>()
    inner.set(b, (inner.get(b) ?? 0) + n)
    m.set(k, inner)
  }
  for (const b of blocks) {
    if (b.population === 0) continue
    const p = areaNumberAt(shapes.precincts, b.lon, b.lat, 'precincts')
    const bn = areaNumberAt(shapes.battalions, b.lon, b.lat, 'battalions')
    if (p === null || bn === null) continue
    add(precinct, p, bn, b.population)
    const z = codeAt(shapes.zips, 'zip', b.lon, b.lat)
    if (!z) continue
    add(cell, `${p}|${z}`, bn, b.population)
    const cd = shapes.community ? codeAt(shapes.community, 'district', b.lon, b.lat) : null
    const cc = shapes.council ? codeAt(shapes.council, 'district', b.lon, b.lat) : null
    if (cd && cc) add(fine, `${p}|${z}|${cd}|${cc}`, bn, b.population)
  }
  return {
    byCell: new Map([...fine].map(([k, v]) => [k, toShares(v)])),
    byPrecinctZip: new Map([...cell].map(([k, v]) => [k, toShares(v)])),
    byPrecinct: new Map([...precinct].map(([k, v]) => [k, toShares(v)])),
    zipArea: (zip) => zipAliases.get(zip) ?? zip,
  }
}

export type PlacementTally = { box: number; geocoded: number; district: number; zip: number; precinct: number; unplaced: number }

/**
 * Places each group of fires in a battalion, by the first method that works: its alarm
 * box's published coordinates; its box's street corner, geocoded; or, as an estimate,
 * split among battalions by where residents of its precinct and ZIP code live (or of its
 * precinct, when the ZIP code is missing or has no residents there).
 */
export function placeInBattalions(
  rows: readonly BoxRow[],
  sources: { boxes: ReadonlyMap<string, Point>; geocoded: ReadonlyMap<string, Point>; weights: ResidentWeights; battalions: AreaShapes },
): { rows: CountRow[]; tally: PlacementTally } {
  const tally: PlacementTally = { box: 0, geocoded: 0, district: 0, zip: 0, precinct: 0, unplaced: 0 }
  const out: CountRow[] = []
  const at = (p: Point) => areaNumberAt(sources.battalions, p.lon, p.lat, 'battalions')
  for (const r of rows) {
    const n = Number(r.n)
    const base = { month: r.month, part: r.part }
    // The precinct view leaves out records with no precinct; so does this, so both views count the same fires.
    if (!r.precinct) {
      out.push({ battalion: undefined, ...base, n: r.n })
      tally.unplaced += n
      continue
    }
    // A location in another borough's battalion (a corner on a borough line) isn't trusted:
    // the precinct view counts the record in its precinct's borough, so this must too.
    const precinct = dispatchPrecinct(r.precinct, r.zip)
    const borough = boroughOfPrecinct(precinct)
    const inBorough = (b: number | null) => (b !== null && BATTALION_BOROUGH.get(b) === borough ? b : null)
    const key = alarmBoxKey(r.borough, r.box)
    const boxPoint = key ? sources.boxes.get(key) : undefined
    const boxBattalion = boxPoint ? inBorough(at(boxPoint)) : null
    if (boxBattalion !== null) {
      out.push({ battalion: String(boxBattalion), ...base, n: r.n, ...(r.total !== undefined ? { total: r.total } : {}) })
      tally.box += n
      continue
    }
    const streets = r.location ? intersectionStreets(r.location) : null
    const corner = streets ? sources.geocoded.get(corneredKey(r.borough, streets)) : undefined
    const cornerBattalion = corner ? inBorough(at(corner)) : null
    if (cornerBattalion !== null) {
      out.push({ battalion: String(cornerBattalion), ...base, n: r.n, ...(r.total !== undefined ? { total: r.total } : {}) })
      tally.geocoded += n
      continue
    }
    const zipArea = r.zip ? sources.weights.zipArea(r.zip) : null
    const byDistrict = zipArea && r.cd && r.cc ? sources.weights.byCell.get(`${precinct}|${zipArea}|${r.cd}|${r.cc}`) : undefined
    const byZip = byDistrict ? undefined : zipArea ? sources.weights.byPrecinctZip.get(`${precinct}|${zipArea}`) : undefined
    const shares = byDistrict ?? byZip ?? sources.weights.byPrecinct.get(precinct)
    if (!shares) {
      out.push({ battalion: undefined, ...base, n: r.n })
      tally.unplaced += n
      continue
    }
    for (const [battalion, share] of shares) {
      out.push({ battalion: String(battalion), ...base, n: String(n * share), ...(r.total !== undefined ? { total: String(Number(r.total) * share) } : {}) })
    }
    if (byDistrict) tally.district += n
    else if (byZip) tally.zip += n
    else tally.precinct += n
  }
  return { rows: out, tally }
}

const API = 'https://data.cityofnewyork.us/resource'
const stamp = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`

/** The SoQL request for one month of records grouped by alarm box, precinct, ZIP code and part. */
export function boxQuery(build: OpenDataCountsBuild, period: { year: number; month: number }): string {
  if (!build.alarmBox) throw new Error(`${build.dataset}: no alarm box fields in the build config`)
  const { boroughField, numberField, locationField } = build.alarmBox
  const url = new URL(`${API}/${build.dataset}.json`)
  const d = build.dateField
  const { year, month } = period
  const end = month === 11 ? stamp(year + 1, 0) : stamp(year, month + 1)
  const districts = build.districtFields ? `${build.districtFields.community} as cd, ${build.districtFields.council} as cc, ` : ''
  url.searchParams.set(
    '$select',
    `${boroughField} as borough, ${numberField} as box, ${locationField} as location, ${build.precinctField} as precinct, ${build.zipField} as zip, ${districts}date_trunc_ym(${d}) as month, ${build.partField} as part, count(*) as n`,
  )
  url.searchParams.set('$where', `(${build.where}) AND ${d} >= '${stamp(year, month)}' AND ${d} < '${end}'`)
  url.searchParams.set('$group', build.districtFields ? 'borough, box, location, precinct, zip, cd, cc, month, part' : 'borough, box, location, precinct, zip, month, part')
  url.searchParams.set('$limit', '100000')
  return url.toString()
}

const METHODS: { key: keyof PlacementTally; method: string; exact: boolean }[] = [
  { key: 'box', method: 'its alarm box’s published location', exact: true },
  { key: 'geocoded', method: 'its alarm box’s street corner, geocoded', exact: true },
  { key: 'district', method: 'residents in its precinct, ZIP code and community and council districts', exact: false },
  { key: 'zip', method: 'residents in its precinct and ZIP code', exact: false },
  { key: 'precinct', method: 'residents in its precinct', exact: false },
]

/** The tally as shares of the records placed, for the app's and data-sources' disclosure. */
export function placementRecord(tally: PlacementTally): Placement[] {
  const placed = tally.box + tally.geocoded + tally.district + tally.zip + tally.precinct
  return METHODS.filter((m) => tally[m.key] > 0).map((m) => ({ method: m.method, share: tally[m.key] / placed, exact: m.exact }))
}
