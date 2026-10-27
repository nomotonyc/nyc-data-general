// Builds normalized FDNY division boundaries/labels and rolls every battalion dataset up to divisions.
// Source geometry: public/data/reference_data/layers/NYC_Fire_Divisions_.geojson
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { DIVISIONS } from '../src/domain/geography.ts'
import { labelPoint, polygonsBy } from './geo-shapes.mjs'

const SOURCE = 'public/data/reference_data/layers/NYC_Fire_Divisions_.geojson'
const source = JSON.parse(readFileSync(SOURCE, 'utf8'))
const polygons = polygonsBy(source.features, (feature) => Number(feature.properties.FireDiv))
const numbers = DIVISIONS.map((division) => division.number)
const missing = numbers.filter((number) => !polygons.has(number))
const unknown = [...polygons.keys()].filter((number) => !numbers.includes(number))
if (missing.length || unknown.length) throw new Error(`Missing divisions ${missing}; unknown ${unknown}`)

const properties = ({ number, borough }) => ({ division: number, borough })
const boundaries = {
  type: 'FeatureCollection',
  features: DIVISIONS.map((division) => ({
    type: 'Feature',
    properties: properties(division),
    geometry: { type: 'MultiPolygon', coordinates: polygons.get(division.number) },
  })),
}
const labels = {
  type: 'FeatureCollection',
  features: DIVISIONS.map((division) => ({
    type: 'Feature',
    properties: properties(division),
    geometry: { type: 'Point', coordinates: labelPoint(polygons.get(division.number)) },
  })),
}
writeFileSync('public/data/nyc-divisions.geojson', JSON.stringify(boundaries))
writeFileSync('public/data/nyc-division-labels.geojson', JSON.stringify(labels))

const tidy = (number) => Math.round(number * 1000) / 1000
const sumSeries = (rows) => rows[0].map((_, index) => tidy(rows.reduce((sum, row) => sum + row[index], 0)))
const sumParts = (rows) => rows[0].map((parts, period) =>
  parts.map((_, part) => tidy(rows.reduce((sum, row) => sum + row[period][part], 0))),
)

function aggregate(table, division, combine) {
  const rows = division.battalions.map((battalion) => table[`bn${battalion}`])
  if (rows.some((row) => !row)) throw new Error(`Division ${division.number} is missing battalion data`)
  return combine(rows)
}

const battalionFiles = readdirSync('public/data/layers').filter((name) => name.endsWith('.battalions.json'))
for (const name of battalionFiles) {
  const file = JSON.parse(readFileSync(`public/data/layers/${name}`, 'utf8'))
  const divisionFile = {
    ...file,
    geography: 'divisions',
    // Keep battalion rows as hidden rollup inputs so borough totals remain exact even where a
    // division command crosses a borough line. Only div* rows become selectable areas.
    values: { ...file.values, ...Object.fromEntries(DIVISIONS.map((division) => [`div${division.number}`, aggregate(file.values, division, sumSeries)])) },
    ...(file.denominators
      ? { denominators: { ...file.denominators, ...Object.fromEntries(DIVISIONS.map((division) => [`div${division.number}`, aggregate(file.denominators, division, sumSeries)])) } }
      : {}),
    parts: { ...file.parts, ...Object.fromEntries(DIVISIONS.map((division) => [`div${division.number}`, aggregate(file.parts, division, sumParts)])) },
  }
  const output = name.replace(/\.battalions\.json$/, '.divisions.json')
  writeFileSync(`public/data/layers/${output}`, JSON.stringify(divisionFile))
}

const vertices = boundaries.features.reduce((count, feature) => count + feature.geometry.coordinates.flat(2).length, 0)
console.log(`Wrote ${DIVISIONS.length} divisions, ${vertices} vertices and ${battalionFiles.length} division datasets`)
