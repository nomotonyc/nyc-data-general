// Builds the precinct boundaries and label points the map loads from public/data.
// Source: NYPD Police Precincts, NYC Open Data y76i-bdw7. Run: npm run data:precincts
import { writeFileSync } from 'node:fs'
import { PRECINCTS, boroughOfPrecinct } from '../src/domain/geography.ts'
import { labelPoint, polygonsBy } from './geo-shapes.mjs'

const SOURCE = 'https://data.cityofnewyork.us/resource/y76i-bdw7.geojson?$limit=200'
const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`)
const { features } = await response.json()

const polygons = polygonsBy(features, (f) => Number(f.properties.precinct))

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
  features: PRECINCTS.map((n) => ({ type: 'Feature', properties: properties(n), geometry: { type: 'Point', coordinates: labelPoint(polygons.get(n)) } })),
}

writeFileSync('public/data/nyc-precincts.geojson', JSON.stringify(boundaries))
writeFileSync('public/data/nyc-precinct-labels.geojson', JSON.stringify(labels))
const vertices = boundaries.features.reduce((n, f) => n + f.geometry.coordinates.flat(2).length, 0)
console.log(`Wrote ${PRECINCTS.length} precincts, ${vertices} vertices, ${JSON.stringify(boundaries).length} bytes`)
