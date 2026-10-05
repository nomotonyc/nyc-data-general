import { describe, expect, it } from 'vitest'
import boundariesJson from '../../public/data/nyc-battalions.geojson?raw'
import labelsJson from '../../public/data/nyc-battalion-labels.geojson?raw'
import precinctsJson from '../../public/data/nyc-precincts.geojson?raw'
import { inRing, precinctAt, type PrecinctShapes } from '../data/build/openDataPoints'
import { BATTALIONS, boroughOfPrecinct } from '../domain/geography'

type Feature = { properties: { battalion: number; borough: string }; geometry: { type: string; coordinates: unknown } }
const boundaries: Feature[] = JSON.parse(boundariesJson).features
const labels: Feature[] = JSON.parse(labelsJson).features
const precincts = JSON.parse(precinctsJson) as PrecinctShapes

const inNyc = ([lng, lat]: number[]) => lng > -74.27 && lng < -73.69 && lat > 40.49 && lat < 40.92

describe('battalion boundaries', () => {
  it('has one feature per FDNY battalion, tagged with its borough', () => {
    expect(boundaries.map((f) => f.properties)).toEqual(BATTALIONS.map((b) => ({ battalion: b.number, borough: b.borough })))
    expect(labels.map((f) => f.properties)).toEqual(boundaries.map((f) => f.properties))
  })

  it('draws every battalion as closed rings inside New York City', () => {
    for (const f of boundaries) {
      expect(f.geometry.type).toBe('MultiPolygon')
      for (const polygon of f.geometry.coordinates as number[][][][]) {
        for (const ring of polygon) {
          expect(ring.length, `battalion ${f.properties.battalion}`).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring[ring.length - 1])
          for (const point of ring) expect(inNyc(point), `battalion ${f.properties.battalion}`).toBe(true)
        }
      }
    }
  })

  it('stays small enough to load quickly', () => {
    expect(boundariesJson.length).toBeLessThan(600_000)
  })

  it('lies wholly in the borough it is listed under, judged by points across its whole shape', () => {
    for (const f of boundaries) {
      let inside = 0
      let total = 0
      for (const [outer] of f.geometry.coordinates as number[][][][]) {
        const xs = outer.map((p) => p[0])
        const ys = outer.map((p) => p[1])
        for (let a = 1; a < 10; a++) {
          for (let b = 1; b < 10; b++) {
            const x = Math.min(...xs) + ((Math.max(...xs) - Math.min(...xs)) * a) / 10
            const y = Math.min(...ys) + ((Math.max(...ys) - Math.min(...ys)) * b) / 10
            if (!inRing(outer, x, y)) continue
            const precinct = precinctAt(precincts, x, y)
            if (precinct === null) continue
            total++
            if (boroughOfPrecinct(precinct) === f.properties.borough) inside++
          }
        }
      }
      // Shorelines and borough-line slivers allow a little slack.
      expect(inside / total, `battalion ${f.properties.battalion}`).toBeGreaterThan(0.97)
    }
  })

  it('puts each battalion’s number inside the borough it is listed under', () => {
    for (const f of labels) {
      const [lon, lat] = f.geometry.coordinates as number[]
      const precinct = precinctAt(precincts, lon, lat)
      expect(precinct, `battalion ${f.properties.battalion}`).not.toBeNull()
      expect(boroughOfPrecinct(precinct!), `battalion ${f.properties.battalion}`).toBe(f.properties.borough)
    }
  })
})
