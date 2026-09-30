// Builds the precinct boundaries and label points the map loads from public/data.
// Source: NYPD Police Precincts, NYC Open Data y76i-bdw7. Run: npm run data:precincts
import { writeFileSync } from 'node:fs'
import polylabel from 'polylabel'
import { PRECINCTS, boroughOfPrecinct } from '../src/domain/geography.ts'

const SOURCE = 'https://data.cityofnewyork.us/resource/y76i-bdw7.geojson?$limit=200'
/** About 2 m at NYC's latitude, matching the borough outlines. */
const TOLERANCE = 0.00002
const round = (n) => Math.round(n * 1e5) / 1e5

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Douglas–Peucker line simplification. */
function simplify(points) {
  if (points.length <= 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  let index = 0
  let max = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], first, last)
    if (d > max) {
      max = d
      index = i
    }
  }
  if (max <= TOLERANCE) return [first, last]
  return [...simplify(points.slice(0, index + 1)).slice(0, -1), ...simplify(points.slice(index))]
}

/** A simplified, rounded, closed ring, or null when too little is left. */
function ring(coordinates) {
  const points = simplify(coordinates)
    .map(([x, y]) => [round(x), round(y)])
    .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1])
  const [fx, fy] = points[0]
  const [lx, ly] = points[points.length - 1]
  if (fx !== lx || fy !== ly) points.push([fx, fy])
  return points.length >= 4 ? points : null
}

const ringArea = (r) => Math.abs(r.reduce((sum, [x, y], i) => {
  const [x2, y2] = r[(i + 1) % r.length]
  return sum + x * y2 - x2 * y
}, 0)) / 2

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`)
const { features } = await response.json()

const polygons = new Map()
for (const feature of features) {
  const precinct = Number(feature.properties.precinct)
  const { type, coordinates } = feature.geometry
  for (const polygon of type === 'MultiPolygon' ? coordinates : [coordinates]) {
    const [outer, ...holes] = polygon.map(ring)
    if (!outer) continue
    polygons.set(precinct, [...(polygons.get(precinct) ?? []), [outer, ...holes.filter(Boolean)]])
  }
}

const missing = PRECINCTS.filter((n) => !polygons.has(n))
const unknown = [...polygons.keys()].filter((n) => !PRECINCTS.includes(n))
if (missing.length || unknown.length) throw new Error(`Missing precincts ${missing}; unknown ${unknown}`)

const properties = (precinct) => ({ precinct, borough: boroughOfPrecinct(precinct) })
const boundaries = {
  type: 'FeatureCollection',
  features: PRECINCTS.map((n) => ({
    type: 'Feature',
    properties: properties(n),
    geometry: { type: 'MultiPolygon', coordinates: polygons.get(n) },
  })),
}
const labels = {
  type: 'FeatureCollection',
  features: PRECINCTS.map((n) => {
    // The label sits at the point furthest inside the precinct's largest piece.
    const largest = polygons.get(n).reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a))
    const [x, y] = polylabel(largest, 0.00001)
    return { type: 'Feature', properties: properties(n), geometry: { type: 'Point', coordinates: [round(x), round(y)] } }
  }),
}

writeFileSync('public/data/nyc-precincts.geojson', JSON.stringify(boundaries))
writeFileSync('public/data/nyc-precinct-labels.geojson', JSON.stringify(labels))
const vertices = boundaries.features.reduce((n, f) => n + f.geometry.coordinates.flat(2).length, 0)
console.log(`Wrote ${PRECINCTS.length} precincts, ${vertices} vertices, ${JSON.stringify(boundaries).length} bytes`)
