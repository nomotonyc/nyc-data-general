import { describe, expect, it } from 'vitest'
import boundariesJson from '../../public/data/nyc-precincts.geojson?raw'
import labelsJson from '../../public/data/nyc-precinct-labels.geojson?raw'
import { PRECINCTS, boroughOfPrecinct } from '../domain/geography'

type Feature = { properties: { precinct: number; borough: string }; geometry: { type: string; coordinates: unknown } }
const boundaries: Feature[] = JSON.parse(boundariesJson).features
const labels: Feature[] = JSON.parse(labelsJson).features

// NYC with a little slack; every coordinate must fall inside.
const inNyc = ([lng, lat]: number[]) => lng > -74.27 && lng < -73.69 && lat > 40.49 && lat < 40.92

describe('precinct boundaries', () => {
  it('has one feature per NYPD precinct, tagged with its borough', () => {
    expect(boundaries.map((f) => f.properties.precinct)).toEqual(PRECINCTS)
    for (const f of boundaries) expect(f.properties.borough).toBe(boroughOfPrecinct(f.properties.precinct))
  })

  it('draws every precinct as closed rings inside New York City', () => {
    for (const f of boundaries) {
      expect(f.geometry.type).toBe('MultiPolygon')
      for (const polygon of f.geometry.coordinates as number[][][][]) {
        for (const ring of polygon) {
          expect(ring.length, `precinct ${f.properties.precinct}`).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring[ring.length - 1])
          for (const point of ring) expect(inNyc(point), `precinct ${f.properties.precinct}`).toBe(true)
        }
      }
    }
  })

  it('stays small enough to load quickly', () => {
    expect(boundariesJson.length).toBeLessThan(600_000)
  })
})

describe('precinct label points', () => {
  it('has one point per precinct inside New York City', () => {
    expect(labels.map((f) => f.properties.precinct)).toEqual(PRECINCTS)
    for (const f of labels) {
      expect(f.geometry.type).toBe('Point')
      expect(inNyc(f.geometry.coordinates as number[])).toBe(true)
    }
  })
})
