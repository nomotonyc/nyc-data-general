// Builds the firehouse points the map and panel import from src/data: each FDNY firehouse, its units
// and the battalion area it stands in (original FDNY boundaries, not the simplified map shapes).
// Sources: FDNY Firehouse Listing (hc8x-tcnd) and Fire Battalions (xzng-ft6f), NYC Open Data.
// Run: npm run data:firehouses
import { writeFileSync } from 'node:fs'
import { runnerImport } from 'vite'

const load = async (path) => (await runnerImport(path, { root: process.cwd(), configFile: false, logLevel: 'silent' })).module
const { firehouseFeatures } = await load('/src/data/build/firehouses.ts')

const API = 'https://data.cityofnewyork.us'
async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

const rows = await get(`${API}/resource/hc8x-tcnd.json?$limit=1000`)
const raw = await get(`${API}/resource/xzng-ft6f.geojson?$limit=200`)
const battalions = {
  type: 'FeatureCollection',
  features: raw.features.map((f) => ({
    type: 'Feature',
    properties: { battalion: Number(f.properties.fire_bn) },
    geometry: f.geometry.type === 'MultiPolygon' ? f.geometry : { type: 'MultiPolygon', coordinates: [f.geometry.coordinates] },
  })),
}
// When the city last changed the listing, shown in Data sources.
const { rowsUpdatedAt } = await get(`${API}/api/views/hc8x-tcnd.json`)

const collection = firehouseFeatures(rows, battalions)
const out = { ...collection, updated: new Date(rowsUpdatedAt * 1000).toISOString().slice(0, 10) }
writeFileSync('src/data/firehouses.json', JSON.stringify(out))

const outside = collection.features.filter((f) => f.properties.battalion === null).map((f) => f.properties.name)
console.log(`Wrote ${collection.features.length} firehouses (listing updated ${out.updated}), ${JSON.stringify(out).length} bytes`)
console.log(`Outside every battalion area: ${outside.length ? outside.join('; ') : 'none'}`)
