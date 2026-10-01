import { boroughOfPrecinct, type Borough } from '../../domain/geography'
import { inRing, precinctAt, type PrecinctShapes } from './openDataPoints'

type Polygon = number[][][]
export type BoroughShapes = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { borough: string } & Record<string, unknown>; geometry: { type: 'MultiPolygon'; coordinates: Polygon[] } }[]
}

/** The borough whose outline contains a point (longitude, latitude), or null. */
export function boroughAt(boroughs: BoroughShapes, lon: number, lat: number): string | null {
  for (const f of boroughs.features) {
    for (const [outer, ...holes] of f.geometry.coordinates) {
      if (inRing(outer, lon, lat) && !holes.some((h) => inRing(h, lon, lat))) return f.properties.borough
    }
  }
  return null
}

/** The borough whose precincts cover most of a polygon, from a 9 × 9 grid of points inside it. */
function patrolBorough(polygon: Polygon, precincts: PrecinctShapes): Borough | null {
  const [outer, ...holes] = polygon
  const xs = outer.map((p) => p[0])
  const ys = outer.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const votes = new Map<Borough, number>()
  for (let a = 1; a < 10; a++) {
    for (let b = 1; b < 10; b++) {
      const x = x0 + ((x1 - x0) * a) / 10
      const y = y0 + ((y1 - y0) * b) / 10
      if (!inRing(outer, x, y) || holes.some((h) => inRing(h, x, y))) continue
      const precinct = precinctAt(precincts, x, y)
      if (precinct !== null) votes.set(boroughOfPrecinct(precinct), (votes.get(boroughOfPrecinct(precinct)) ?? 0) + 1)
    }
  }
  let best: Borough | null = null
  for (const [borough, n] of votes) if (best === null || n > votes.get(best)!) best = borough
  return best
}

/**
 * Moves each piece of the borough outlines to the borough whose precincts cover it, so the
 * map's boroughs are NYPD's patrol boroughs and match the numbers added up for them: Rikers
 * and Roosevelt Islands go with Queens (precinct 114), Marble Hill with the Bronx (precinct 50).
 * Pieces no precinct covers stay where they were.
 */
export function alignBoroughs(boroughs: BoroughShapes, precincts: PrecinctShapes): BoroughShapes {
  const pieces = new Map<string, Polygon[]>(boroughs.features.map((f) => [f.properties.borough, []]))
  for (const f of boroughs.features) {
    for (const polygon of f.geometry.coordinates) {
      const owner = patrolBorough(polygon, precincts)
      const target = owner !== null && pieces.has(owner) ? owner : f.properties.borough
      pieces.get(target)!.push(polygon)
    }
  }
  return {
    ...boroughs,
    features: boroughs.features.map((f) => ({ ...f, geometry: { ...f.geometry, coordinates: pieces.get(f.properties.borough)! } })),
  }
}
