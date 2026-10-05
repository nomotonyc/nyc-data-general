import { describe, expect, it } from 'vitest'
import { getLayer, type OpenDataCountsBuild } from '../../layers'
import type { AreaShapes } from './openDataPoints'
import {
  alarmBoxKey,
  boxQuery,
  placementRecord,
  boxLocations,
  intersectionStreets,
  placeInBattalions,
  residentWeights,
  type BoxRow,
  type DistrictShapes,
  type ZipShapes,
} from './battalionPlacement'
import type { Block } from './census'

const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]
const shapes = (key: 'precinct' | 'battalion', cells: [number, number, number, number][]): AreaShapes => ({
  type: 'FeatureCollection',
  features: cells.map(([n, x, y, s]) => ({ type: 'Feature', properties: { [key]: n }, geometry: { type: 'MultiPolygon', coordinates: [[square(x, y, s)]] } })),
})
// Precinct 44 covers x 0–20; battalion 14 covers x 0–10, battalion 15 x 10–20. ZIP 10452 covers all of it.
const precincts = shapes('precinct', [[44, 0, 0, 20]])
const battalions = shapes('battalion', [[14, 0, 0, 10], [15, 10, 0, 10]])
const zips: ZipShapes = {
  type: 'FeatureCollection',
  features: [{ properties: { zip: '10452' }, geometry: { coordinates: [[square(0, 0, 20)]] } }],
}
const districts = {
  community: shapes('precinct', [[205, 0, 0, 20]]) as unknown as DistrictShapes,
  council: { type: 'FeatureCollection', features: [] } as unknown as DistrictShapes,
}
districts.community = { type: 'FeatureCollection', features: [{ properties: { district: '205' }, geometry: { coordinates: [[square(0, 0, 20)]] } }] }
districts.council = {
  type: 'FeatureCollection',
  features: [
    { properties: { district: '15' }, geometry: { coordinates: [[square(0, 0, 12)]] } },
    { properties: { district: '16' }, geometry: { coordinates: [[square(12, 0, 8)]] } },
  ],
}
const block = (lon: number, population: number): Block => ({ tract: 'T', population, landSqM: 1, lat: 5, lon })
const row = (fields: Partial<BoxRow>): BoxRow => ({
  borough: 'BRONX',
  box: '2364',
  location: 'HUNTS POINT AVE & BRUCKNER BLVD',
  precinct: '44',
  zip: '10452',
  month: '2025-03-01T00:00:00.000',
  part: 'Private Dwelling Fire',
  n: '4',
  ...fields,
})

describe('alarmBoxKey', () => {
  it('matches the published box ids: borough letter and four-digit number', () => {
    expect(alarmBoxKey('BRONX', '364')).toBe('X0364')
    expect(alarmBoxKey('RICHMOND / STATEN ISLAND', '863')).toBe('R0863')
    expect(alarmBoxKey('MANHATTAN', '1605')).toBe('M1605')
    expect(alarmBoxKey('ATLANTIS', '1')).toBeNull()
  })
})

describe('intersectionStreets', () => {
  it('splits a box location into its two streets, dropping FDNY suffixes', () => {
    expect(intersectionStreets('HUNTS POINT AVE & BRUCKNER BLVD')).toEqual(['HUNTS POINT AVE', 'BRUCKNER BLVD'])
    expect(intersectionStreets('JAMAICA AVE & 242 ST/NCFD')).toEqual(['JAMAICA AVE', '242 ST'])
    expect(intersectionStreets('PIER 40')).toBeNull()
  })
})

describe('residentWeights', () => {
  // 300 residents in battalion 14's half, 100 in battalion 15's.
  const w = residentWeights([block(5, 300), block(15, 100)], { precincts, battalions, zips, ...districts })

  it('splits each precinct-and-ZIP area among battalions by its residents', () => {
    expect(w.byPrecinctZip.get('44|10452')).toEqual(new Map([[14, 0.75], [15, 0.25]]))
  })

  it('and each precinct as a whole, for records without a usable ZIP', () => {
    expect(w.byPrecinct.get(44)).toEqual(new Map([[14, 0.75], [15, 0.25]]))
  })
})

describe('placeInBattalions', () => {
  const weights = residentWeights([block(5, 300), block(15, 100)], { precincts, battalions, zips, ...districts })
  const boxes = boxLocations([{ borobox: 'X2364', latitude: '5', longitude: '15' }])

  it('places a fire by its alarm box when the box is published', () => {
    const { rows, tally } = placeInBattalions([row({})], { boxes, geocoded: new Map(), weights, battalions })
    expect(rows).toEqual([{ battalion: '15', month: '2025-03-01T00:00:00.000', part: 'Private Dwelling Fire', n: '4' }])
    expect(tally).toEqual({ box: 4, geocoded: 0, district: 0, zip: 0, precinct: 0, unplaced: 0 })
  })

  it('distrusts a box location in another borough’s battalion, so both views keep the same borough totals', () => {
    // Battalion 3 is in the Bronx, precinct 75 in Brooklyn.
    const bronx = shapes('battalion', [[3, 0, 0, 20]])
    const brooklynRow = row({ precinct: '75', zip: undefined })
    const w = residentWeights([block(5, 300)], { precincts: shapes('precinct', [[75, 0, 0, 20]]), battalions: bronx, zips })
    const { tally } = placeInBattalions([brooklynRow], { boxes: boxLocations([{ borobox: 'X2364', latitude: '5', longitude: '5' }]), geocoded: new Map(), weights: w, battalions: bronx })
    expect(tally.box).toBe(0)
  })

  it('then by the geocoded box location', () => {
    const geocoded = new Map([['X|HUNTS POINT AVE|BRUCKNER BLVD', { lon: 5, lat: 5 }]])
    const { rows, tally } = placeInBattalions([row({ box: '9999' })], { boxes, geocoded, weights, battalions })
    expect(rows[0].battalion).toBe('14')
    expect(tally.geocoded).toBe(4)
  })

  it('otherwise splits it by residents in its precinct and ZIP code, as an estimate', () => {
    const { rows, tally } = placeInBattalions([row({ box: '9999' })], { boxes, geocoded: new Map(), weights, battalions })
    expect(rows).toEqual([
      { battalion: '14', month: '2025-03-01T00:00:00.000', part: 'Private Dwelling Fire', n: '3' },
      { battalion: '15', month: '2025-03-01T00:00:00.000', part: 'Private Dwelling Fire', n: '1' },
    ])
    expect(tally.zip).toBe(4)
  })

  it('splits a ratio layer’s summed field along with its count', () => {
    const { rows } = placeInBattalions([{ ...row({ box: '', borough: '' }), n: '8', total: '4000' }], { boxes, geocoded: new Map(), weights, battalions })
    expect(rows.map((r) => [r.battalion, r.n, r.total])).toEqual([
      ['14', '6', '3000'],
      ['15', '2', '1000'],
    ])
  })

  it('by its precinct alone when the ZIP code is missing or has no residents there', () => {
    const { tally } = placeInBattalions([row({ box: '9999', zip: '99999' }), row({ box: '9999', zip: undefined })], { boxes, geocoded: new Map(), weights, battalions })
    expect(tally.precinct).toBe(8)
  })

  it('leaves out records with no precinct even when their box is known, so both views count the same fires', () => {
    const { rows, tally } = placeInBattalions([row({ precinct: undefined })], { boxes, geocoded: new Map(), weights, battalions })
    expect(rows[0].battalion).toBeUndefined()
    expect(tally.unplaced).toBe(4)
  })

  it('reports records with no precinct it cannot place', () => {
    const { rows, tally } = placeInBattalions([row({ box: '9999', precinct: undefined })], { boxes, geocoded: new Map(), weights, battalions })
    expect(rows).toEqual([{ battalion: undefined, month: '2025-03-01T00:00:00.000', part: 'Private Dwelling Fire', n: '4' }])
    expect(tally.unplaced).toBe(4)
  })
})

describe('boxQuery', () => {
  it('asks for one month of records grouped by alarm box, precinct, ZIP code and part', () => {
    const build = getLayer('structural-fires').build as OpenDataCountsBuild
    const p = new URL(boxQuery(build, { year: 2025, month: 2 })).searchParams
    expect(p.get('$select')).toBe(
      'alarm_box_borough as borough, alarm_box_number as box, alarm_box_location as location, policeprecinct as precinct, zipcode as zip, communitydistrict as cd, citycouncildistrict as cc, date_trunc_ym(incident_datetime) as month, incident_classification as part, count(*) as n',
    )
    expect(p.get('$group')).toBe('borough, box, location, precinct, zip, cd, cc, month, part')
    expect(p.get('$where')).toContain("incident_datetime >= '2025-03-01T00:00:00' AND incident_datetime < '2025-04-01T00:00:00'")
  })
})

describe('placementRecord', () => {
  it('turns the tally into shares of placed records, exact and estimated', () => {
    expect(placementRecord({ box: 69, geocoded: 17, district: 0, zip: 10, precinct: 4, unplaced: 3 })).toEqual([
      { method: 'its alarm box’s published location', share: 0.69, exact: true },
      { method: 'its alarm box’s street corner, geocoded', share: 0.17, exact: true },
      { method: 'residents in its precinct and ZIP code', share: 0.1, exact: false },
      { method: 'residents in its precinct', share: 0.04, exact: false },
    ])
  })

  it('leaves out methods that placed nothing', () => {
    expect(placementRecord({ box: 1, geocoded: 0, district: 0, zip: 1, precinct: 0, unplaced: 0 }).map((p) => p.method)).toEqual([
      'its alarm box’s published location',
      'residents in its precinct and ZIP code',
    ])
  })
})

describe('districts', () => {
  // Battalion 14 is x 0–10, 15 is x 10–20; council 15 is x 0–12, so a council-15 record is mostly in battalion 14.
  const w = residentWeights([block(5, 300), block(11, 100), block(15, 100)], { precincts, battalions, zips, ...districts })
  const boxes = boxLocations([])

  it('weighs precinct, ZIP and district areas by their residents', () => {
    expect(w.byCell.get('44|10452|205|15')).toEqual(new Map([[14, 0.75], [15, 0.25]]))
    expect(w.byCell.get('44|10452|205|16')).toEqual(new Map([[15, 1]]))
  })

  it('places a record by its districts when they narrow it down, counted as its own method', () => {
    const { rows, tally } = placeInBattalions([row({ box: '9999', cd: '205', cc: '16' })], { boxes, geocoded: new Map(), weights: w, battalions })
    expect(rows.map((r) => [r.battalion, r.n])).toEqual([['15', '4']])
    expect(tally.district).toBe(4)
  })

  it('falls back to precinct and ZIP when the district area has no residents', () => {
    const { tally } = placeInBattalions([row({ box: '9999', cd: '205', cc: '99' })], { boxes, geocoded: new Map(), weights: w, battalions })
    expect(tally.zip).toBe(4)
  })

  it('names the district method in the placement record', () => {
    expect(placementRecord({ box: 0, geocoded: 0, district: 1, zip: 0, precinct: 0, unplaced: 0 })).toEqual([
      { method: 'residents in its precinct, ZIP code and community and council districts', share: 1, exact: false },
    ])
  })
})
