// Builds the FDNY battalion boundaries and label points the map loads from public/data.
// Source: Fire Battalions, NYC Open Data xzng-ft6f. Run: npm run data:battalions
import { writeFileSync } from 'node:fs'
import { BATTALIONS } from '../src/domain/geography.ts'
import { labelPoint, polygonsBy } from './geo-shapes.mjs'

const SOURCE = 'https://data.cityofnewyork.us/resource/xzng-ft6f.geojson?$limit=200'

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`)
const { features } = await response.json()
const polygons = polygonsBy(features, (f) => Number(f.properties.fire_bn))

const numbers = BATTALIONS.map((b) => b.number)
const missing = numbers.filter((n) => !polygons.has(n))
const unknown = [...polygons.keys()].filter((n) => !numbers.includes(n))
if (missing.length || unknown.length) throw new Error(`Missing battalions ${missing}; unknown ${unknown}`)

const properties = ({ number, borough }) => ({ battalion: number, borough })
const boundaries = {
  type: 'FeatureCollection',
  features: BATTALIONS.map((b) => ({ type: 'Feature', properties: properties(b), geometry: { type: 'MultiPolygon', coordinates: polygons.get(b.number) } })),
}
const labels = {
  type: 'FeatureCollection',
  features: BATTALIONS.map((b) => ({ type: 'Feature', properties: properties(b), geometry: { type: 'Point', coordinates: labelPoint(polygons.get(b.number)) } })),
}

writeFileSync('public/data/nyc-battalions.geojson', JSON.stringify(boundaries))
writeFileSync('public/data/nyc-battalion-labels.geojson', JSON.stringify(labels))
const vertices = boundaries.features.reduce((n, f) => n + f.geometry.coordinates.flat(2).length, 0)
console.log(`Wrote ${BATTALIONS.length} battalions, ${vertices} vertices, ${JSON.stringify(boundaries).length} bytes`)
