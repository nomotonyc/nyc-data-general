import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const write = (p, value) => fs.writeFileSync(path.join(root, p), `${JSON.stringify(value)}\n`)
const source = read('public/data/reference_data/nyc-neighborhoods.geo.json')
const boroughs = read('public/data/nyc-boroughs.geojson')
const precincts = read('public/data/nyc-precincts.geojson')
const blocks = read('.cache/census/nyc-blocks-2020.json')

function polygons(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}
function inRing(ring, x, y) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function contains(feature, x, y) {
  return polygons(feature.geometry).some(([outer, ...holes]) => inRing(outer, x, y) && !holes.some((h) => inRing(h, x, y)))
}
function find(featureCollection, x, y, property) {
  return featureCollection.features.find((f) => contains(f, x, y))?.properties[property]
}

const features = source.features.map((f, i) => ({
  type: 'Feature', id: i + 1,
  properties: { neighborhood: i + 1, name: f.properties.name, borough: null },
  geometry: f.geometry,
}))
const centers = features.map((f) => {
  const ring = polygons(f.geometry)[0]?.[0] ?? []
  return { feature: f, point: ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]) }
})
const weight = new Map()
const landWeight = new Map()
for (const b of blocks) {
  const p = Number(find(precincts, b.lon, b.lat, 'precinct'))
  if (!p) continue
  const hood = features.find((f) => contains(f, b.lon, b.lat)) ?? centers.reduce((best, item) =>
    Math.hypot(item.point[0] - b.lon, item.point[1] - b.lat) < Math.hypot(best.point[0] - b.lon, best.point[1] - b.lat) ? item : best,
  ).feature
  const id = hood.properties.neighborhood
  const key = `${p}|${id}`
  weight.set(key, (weight.get(key) ?? 0) + b.population)
  landWeight.set(key, (landWeight.get(key) ?? 0) + b.landSqM)
  if (!hood.properties.borough) hood.properties.borough = find(boroughs, b.lon, b.lat, 'borough') ?? null
}
// Use an interior vertex if a neighborhood contains no inhabited census block.
for (const f of features) {
  if (!f.properties.borough) {
    const ring = polygons(f.geometry)[0]?.[0]
    const pt = ring?.[Math.floor((ring?.length ?? 1) / 2)]
    f.properties.borough = pt ? find(boroughs, pt[0], pt[1], 'borough') ?? 'Manhattan' : 'Manhattan'
  }
}
const byPrecinct = new Map()
for (const [key, pop] of weight) {
  const [p, hood] = key.split('|').map(Number)
  const row = byPrecinct.get(p) ?? []
  row.push({ hood, pop, land: landWeight.get(key) ?? 0 })
  byPrecinct.set(p, row)
}
const weightsFor = (p, kind) => {
  const rows = byPrecinct.get(Number(p)) ?? []
  const total = rows.reduce((s, r) => s + r[kind], 0)
  if (!total) return []
  return rows.map((r) => [r.hood, r[kind] / total])
}
write('public/data/nyc-neighborhoods.geojson', { type: 'FeatureCollection', features })
const areaSource = `import type { Area } from './geography'\n\nexport const NEIGHBORHOOD_AREAS = ${JSON.stringify(features.map((f) => ({ id: `hood${f.properties.neighborhood}`, kind: 'neighborhood', number: f.properties.neighborhood, label: f.properties.name, borough: f.properties.borough })), null, 2)} as const satisfies readonly Area[]\n`
fs.writeFileSync(path.join(root, 'src/domain/neighborhoods.generated.ts'), areaSource)

const unweightedPrecincts = new Set()
for (const file of fs.readdirSync(path.join(root, 'public/data/layers')).filter((n) => n.endsWith('.json') && !n.includes('.battalions.') && !n.includes('.divisions.') && !n.includes('.neighborhoods.'))) {
  const input = read(`public/data/layers/${file}`)
  const values = {}, parts = {}, denominators = input.denominators ? {} : undefined
  for (const f of features) {
    const id = `hood${f.properties.neighborhood}`
    values[id] = input.values[Object.keys(input.values)[0]].map(() => 0)
    parts[id] = input.parts[Object.keys(input.parts)[0]].map((period) => period.map(() => 0))
    if (denominators) denominators[id] = input.denominators[Object.keys(input.denominators)[0]].map(() => 0)
  }
  for (const [precinct, series] of Object.entries(input.values)) {
    const residentShares = weightsFor(precinct, 'pop')
    const allocationShares = residentShares.length ? residentShares : weightsFor(precinct, 'land')
    if (!residentShares.length) unweightedPrecincts.add(precinct)
    for (const [hood, share] of allocationShares) {
      const id = `hood${hood}`
      series.forEach((n, i) => { values[id][i] += n * share })
      input.parts[precinct].forEach((row, i) => row.forEach((n, j) => { parts[id][i][j] += n * share }))
    }
    if (denominators) for (const [hood, share] of weightsFor(precinct, 'land')) {
      const id = `hood${hood}`
      input.denominators[precinct].forEach((n, i) => { denominators[id][i] += n * share })
    }
  }
  for (const id of Object.keys(values)) {
    values[id] = values[id].map((n) => Math.round(n * 100) / 100)
    parts[id] = parts[id].map((row) => row.map((n) => Math.round(n * 100) / 100))
    if (denominators) denominators[id] = denominators[id].map((n) => Math.round(n * 10000) / 10000)
  }
  write(`public/data/layers/${file.replace('.json', '.neighborhoods.json')}`, {
    layerId: input.layerId, geography: 'neighborhoods', built: new Date().toISOString(), from: input.from, to: input.to,
    values, parts, ...(denominators ? { denominators } : {}),
    placement: [{ method: '2020 census-block residents within each precinct', share: 1, exact: false }],
  })
}
console.log(`Built neighborhood boundaries and ${fs.readdirSync(path.join(root, 'public/data/layers')).filter((n) => n.endsWith('.neighborhoods.json')).length} neighborhood datasets. Precincts with no neighborhood resident weight: ${[...unweightedPrecincts].join(', ') || 'none'}.`)
