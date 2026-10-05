// Shared by the boundary builds: simplify NYC Open Data polygons and place a label in each.
import polylabel from 'polylabel'

/** About 2 m at NYC's latitude, matching the borough outlines. */
export const TOLERANCE = 0.00002
export const round = (n) => Math.round(n * 1e5) / 1e5

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
export function ring(coordinates) {
  const points = simplify(coordinates)
    .map(([x, y]) => [round(x), round(y)])
    .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1])
  const [fx, fy] = points[0]
  const [lx, ly] = points[points.length - 1]
  if (fx !== lx || fy !== ly) points.push([fx, fy])
  return points.length >= 4 ? points : null
}

export const ringArea = (r) => Math.abs(r.reduce((sum, [x, y], i) => {
  const [x2, y2] = r[(i + 1) % r.length]
  return sum + x * y2 - x2 * y
}, 0)) / 2

/** Simplified polygons per area number, from a GeoJSON feature collection. */
export function polygonsBy(features, numberOf) {
  const polygons = new Map()
  for (const feature of features) {
    const n = numberOf(feature)
    const { type, coordinates } = feature.geometry
    for (const polygon of type === 'MultiPolygon' ? coordinates : [coordinates]) {
      const [outer, ...holes] = polygon.map(ring)
      if (!outer) continue
      polygons.set(n, [...(polygons.get(n) ?? []), [outer, ...holes.filter(Boolean)]])
    }
  }
  return polygons
}

/** The point furthest inside an area's largest piece, where its number is written. */
export function labelPoint(polygons) {
  const largest = polygons.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a))
  const [x, y] = polylabel(largest, 0.00001)
  return [round(x), round(y)]
}
