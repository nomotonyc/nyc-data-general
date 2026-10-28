// Build the EMS Stations map layer from NYC's Facilities Database.
// Run: npm run data:ems-stations
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const endpoint = 'https://data.cityofnewyork.us/resource/67g2-p84d.json'
export const facilityType = 'AMBULANCE STATION'
const output = new URL('../public/data/reference_data/ems_stations.geojson', import.meta.url)
const boroughs = {
  MANHATTAN: 'Manhattan', BRONX: 'Bronx', BROOKLYN: 'Brooklyn',
  QUEENS: 'Queens', 'STATEN ISLAND': 'Staten Island',
}

export const hospitalAttached = (name) => /\b(?:HOSP(?:ITAL)?|MED CTR|MEDICAL)\b/i.test(name)

export function buildEmsStations(rows, retrievedAt = new Date().toISOString()) {
  const ids = new Set()
  const features = rows.map((row) => {
    if (row.factype !== facilityType) throw new Error(`Unexpected facility type: ${row.factype}`)
    if (!row.uid || ids.has(row.uid)) throw new Error(`Missing or duplicate UID: ${row.uid}`)
    ids.add(row.uid)
    const longitude = Number(row.longitude)
    const latitude = Number(row.latitude)
    if (!row.longitude || !row.latitude || !Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error(`Missing coordinates for ${row.facname}`)
    const borough = boroughs[row.boro]
    if (!borough) throw new Error(`Unexpected borough: ${row.boro}`)
    return {
      type: 'Feature',
      properties: { ...row, id: row.uid, name: row.facname, borough, hospitalAttached: hospitalAttached(row.facname) },
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
    }
  }).sort((a, b) => a.properties.borough.localeCompare(b.properties.borough)
    || a.properties.name.localeCompare(b.properties.name) || a.properties.id.localeCompare(b.properties.id))

  return {
    type: 'FeatureCollection', layerId: 'ems_stations', facilityType,
    source: 'NYC Facilities Database', datasetId: '67g2-p84d',
    sourceUrl: 'https://data.cityofnewyork.us/City-Government/Facilities-Database-Shapefile/2fpa-bnsx',
    retrievedAt, features,
  }
}

async function main() {
  const fileIndex = process.argv.indexOf('--from-file')
  let rows
  if (fileIndex !== -1) {
    const input = JSON.parse(readFileSync(process.argv[fileIndex + 1], 'utf8'))
    rows = input.type === 'FeatureCollection' ? input.features.map((feature) => feature.properties) : input
  } else {
    const url = new URL(endpoint)
    url.search = new URLSearchParams({
      $where: `factype = '${facilityType}'`, $order: 'boro,facname,uid', $limit: '50000',
    }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`NYC Open Data answered ${response.status}`)
    rows = await response.json()
  }
  const collection = buildEmsStations(rows)
  mkdirSync(new URL('.', output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(collection, null, 2)}\n`)
  console.log(`Wrote ${collection.features.length} ${facilityType} facilities to ${fileURLToPath(output)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1 })
}
