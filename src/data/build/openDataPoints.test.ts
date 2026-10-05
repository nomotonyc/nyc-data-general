import { describe, expect, it } from 'vitest'
import precinctsJson from '../../../public/data/nyc-precincts.geojson?raw'
import { getLayer, type OpenDataPointsBuild } from '../../layers'
import { aggregateCounts } from './openDataCounts'
import { pointsQuery, pointsToCountRows, precinctAt, type AreaShapes, type PointRow, type PrecinctShapes } from './openDataPoints'

const nyc = JSON.parse(precinctsJson) as PrecinctShapes
const layer = getLayer('fire-apparatus-accidents')
const build = layer.build as OpenDataPointsBuild

// Precinct 1 is a 10×10 square with a 2×2 hole; precinct 5 sits in the hole.
const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]
const shapes: PrecinctShapes = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { precinct: 1 }, geometry: { type: 'MultiPolygon', coordinates: [[square(0, 0, 10), square(4, 4, 2)]] } },
    { type: 'Feature', properties: { precinct: 5 }, geometry: { type: 'MultiPolygon', coordinates: [[square(4, 4, 2)]] } },
  ],
}

describe('precinctAt', () => {
  it('finds the precinct a point falls in, respecting holes', () => {
    expect(precinctAt(shapes, 1, 1)).toBe(1)
    expect(precinctAt(shapes, 5, 5)).toBe(5)
    expect(precinctAt(shapes, 20, 20)).toBeNull()
  })

  it('places real points in NYPD precincts', () => {
    expect(precinctAt(nyc, -73.9934, 40.7505)).toBe(14) // Penn Station, Midtown South
    expect(precinctAt(nyc, -73.9855, 40.758)).toBe(18) // Times Square, Midtown North
    expect(precinctAt(nyc, -73.9654, 40.7829)).toBe(22) // Central Park
    expect(precinctAt(nyc, -74.035, 40.665)).toBeNull() // Upper New York Bay
  })
})

describe('pointsQuery', () => {
  it('asks for one month of matching records with their location and part', () => {
    const p = new URL(pointsQuery(build, { year: 2025, month: 2 })).searchParams
    expect(p.get('$select')).toMatch(/^crash_date as date, latitude as lat, longitude as lon, case\(.*\) as part$/)
    expect(p.get('$where')).toMatch(/^\(.*upper\(trim\(vehicle_type_code1\)\) IN \(.*'FIRE TRUCK'.*\)\) AND crash_date >= '2025-03-01T00:00:00' AND crash_date < '2025-04-01T00:00:00'$/)
  })
})

describe('pointsToCountRows', () => {
  const row = (lat: number | undefined, lon: number | undefined, part = 'No one hurt'): PointRow => ({
    date: '2025-03-14T00:00:00.000',
    lat: lat === undefined ? undefined : String(lat),
    lon: lon === undefined ? undefined : String(lon),
    part,
  })

  it('turns each record into a count of one for its precinct and month', () => {
    expect(pointsToCountRows([row(1, 1, 'Someone injured')], shapes)).toEqual([
      { precinct: '1', month: '2025-03-14T00:00:00.000', part: 'Someone injured', n: '1' },
    ])
  })

  it('leaves records without coordinates, at 0,0 or outside every precinct without a precinct', () => {
    const rows = pointsToCountRows([row(undefined, undefined), row(0, 0), row(20, 20)], shapes)
    expect(rows.map((r) => r.precinct)).toEqual([undefined, undefined, undefined])
  })

  it('feeds the same counting as the other layers', () => {
    const { file, report } = aggregateCounts(layer, pointsToCountRows([row(40.7505, -73.9934), row(40.7505, -73.9934, 'Someone killed'), row(undefined, undefined)], nyc))
    const march2025 = (2025 - 2019) * 12 + 2
    expect(file.values['14'][march2025]).toBe(2)
    expect(file.parts['14'][march2025]).toEqual([1, 0, 1])
    expect(report.find((r) => r.year === 2025)).toEqual({ year: 2025, counted: 2, noPrecinct: 1 })
  })
})

describe('battalions', () => {
  // Battalion 14 is a 10×10 square.
  const battalions: AreaShapes = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { battalion: 14 }, geometry: { type: 'MultiPolygon', coordinates: [[square(0, 0, 10)]] } }],
  }
  const row = (lat: number, lon: number): PointRow => ({ date: '2025-03-14T00:00:00.000', lat: String(lat), lon: String(lon), part: 'No one hurt' })

  it('places each record in the battalion containing it', () => {
    expect(pointsToCountRows([row(1, 1), row(20, 20)], battalions, 'battalions')).toEqual([
      { battalion: '14', month: '2025-03-14T00:00:00.000', part: 'No one hurt', n: '1' },
      { battalion: undefined, month: '2025-03-14T00:00:00.000', part: 'No one hurt', n: '1' },
    ])
  })

  it('counts by battalion, every battalion present', () => {
    const { file, report } = aggregateCounts(layer, pointsToCountRows([row(1, 1), row(20, 20)], battalions, 'battalions'), 'battalions')
    const march2025 = (2025 - 2019) * 12 + 2
    expect(file.geography).toBe('battalions')
    expect(Object.keys(file.values)).toHaveLength(49)
    expect(file.values.bn14[march2025]).toBe(1)
    expect(report.find((r) => r.year === 2025)).toEqual({ year: 2025, counted: 1, noPrecinct: 1 })
  })
})
