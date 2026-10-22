// Convert the pasted hospital tables into NYC-only GeoJSON point layers.
// Run: node scripts/build-hospitals.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const directory = new URL('../public/data/layers/', import.meta.url)
const boroughs = { Bronx: 'Bronx', Kings: 'Brooklyn', 'New York': 'Manhattan', Queens: 'Queens', Richmond: 'Staten Island' }
const clean = (value = '') => value.replace(/\[(?:Note\s+)?\d+\]/g, '').trim()
const countyName = (value) => clean(value).replace(/ \(county\)$/, '')

export function coordinates(value) {
  if (!value) return null
  const matches = [...value.matchAll(/(\d+)°(\d+(?:\.\d+)?)′(?:(\d+(?:\.\d+)?)″)?([NSEW])/g)]
  if (matches.length !== 2 || matches[0][4] !== 'N' || matches[1][4] !== 'W') throw new Error(`Invalid coordinates: ${value}`)
  const decimal = matches.map(([, d, m, s, direction]) => {
    if (+m >= 60 || +(s ?? 0) >= 60) throw new Error(`Invalid DMS: ${value}`)
    return Number(((+d + +m / 60 + +(s ?? 0) / 3600) * ('SW'.includes(direction) ? -1 : 1)).toFixed(6))
  })
  return [decimal[1], decimal[0]]
}

export function parseTable(text, psychiatric = false) {
  const rows = []
  let pending = []
  for (const line of text.split(/\r?\n/).slice(2)) {
    if (!line.trim() || !clean(line)) continue
    if (!line.includes('\t')) { pending.push(line); continue }
    const cells = line.split('\t')
    if (pending.length) {
      // The NewYork-Presbyterian multiline name ends on a separate line;
      // its first tabular cell is the county, not part of the name.
      if (!psychiatric && cells.length === 5) cells.unshift(pending.join(' / '))
      else cells[0] = [...pending, cells[0]].join(' ')
      pending = []
    }
    if (psychiatric) while (cells.length < 6) cells.push('')
    rows.push(cells)
  }
  if (pending.length) throw new Error(`Unfinished row: ${pending.join(' ')}`)
  const systems = new Set(rows.filter((r) => r.length === 7).map((r) => clean(r[1])).filter(Boolean))
  let previous = {}
  return rows.map((cells) => {
    let name, healthSystem, county, city, location, opened, beds
    let countyInherited = false
    if (psychiatric) {
      ;[name, county, city, location, opened, beds] = cells
      healthSystem = null // The source embeds affiliations in some facility names.
    } else {
      ;[location, opened, beds] = cells.slice(-3)
      const leading = cells.slice(0, -3)
      name = leading[0]
      healthSystem = previous.healthSystem
      county = previous.county
      city = previous.city
      countyInherited = true
      if (leading.length === 4) {
        ;[, healthSystem, county, city] = leading
        countyInherited = false
      } else if (leading.length === 3 && leading[2] !== '') {
        ;[, county, city] = leading
        countyInherited = false
      } else if (leading.length === 3 && leading[2] === '') {
        healthSystem = leading[1]
      } else if (leading.length === 2) {
        if (systems.has(clean(leading[1]))) healthSystem = leading[1]
        else city = leading[1]
      } else if (leading.length !== 1) {
        throw new Error(`Unexpected cells for ${name}: ${JSON.stringify(leading)}`)
      }
    }
    county = countyName(county)
    previous = { healthSystem, county, city }
    if (!county) throw new Error(`Missing county for ${name}`)
    return {
      name: clean(name), healthSystem: clean(healthSystem ?? '') || null,
      county, city: clean(city), countyInherited,
      coordinates: coordinates(location), coordinatesText: location || null,
      opened: clean(opened) || null, beds: clean(beds) || null,
      sourceText: cells.join('\t'),
    }
  })
}

export function build(text, psychiatric, source) {
  const records = parseTable(text, psychiatric).filter((r) => Object.hasOwn(boroughs, r.county))
  return {
    type: 'FeatureCollection',
    layerId: psychiatric ? 'psych_hospitals_nyc' : 'hospitals_nyc',
    source,
    countyFilter: Object.keys(boroughs),
    notes: [
      'County filtering includes inherited cells from the pasted table; New York (county) is normalized to New York.',
      'Source entries, including historical facilities, are retained without verifying current operating status.',
      'Beds and opening/closing dates remain text to preserve ranges, alternatives and uncertainty. Source citations are preserved in sourceText.',
      'Missing coordinates produce null geometry; no location is guessed.',
    ],
    features: records.map(({ coordinates: point, ...record }, index) => ({
      type: 'Feature',
      properties: { id: index + 1, ...record, borough: boroughs[record.county] },
      geometry: point ? { type: 'Point', coordinates: point } : null,
    })),
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [source, psychiatric] of [['hospitals_nyc.txt', false], ['psych_hospitals_nyc', true]]) {
    const collection = build(readFileSync(new URL(source, directory), 'utf8'), psychiatric, source)
    writeFileSync(new URL(`${collection.layerId}.json`, directory), `${JSON.stringify(collection, null, 2)}\n`)
    const counts = Object.fromEntries(Object.keys(boroughs).map((county) => [county, collection.features.filter((f) => f.properties.county === county).length]))
    console.log(`${collection.layerId}: ${collection.features.length} facilities; ${JSON.stringify(counts)}`)
  }
}
