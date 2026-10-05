// Builds a layer's real data from its `build` config: node scripts/build-layer.mjs <layer-id>
// Writes public/data/layers/<id>.json and prints what was counted per year. Each month's API
// response is cached in .cache/layers/<id>/ by month and query, so a rerun only fetches what it
// doesn't have and a changed build config refetches;
// pass --refresh to fetch everything again.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { runnerImport } from 'vite'

const id = process.argv[2]
const refresh = process.argv.includes('--refresh')
if (!id) throw new Error('Usage: npm run data:layer -- <layer-id> [--refresh]')

const load = async (path) => (await runnerImport(path, { root: process.cwd(), configFile: false, logLevel: 'silent' })).module
const { getLayer, layerGeographies } = await load('/src/layers/index.ts')
const { layerFileName } = await load('/src/data/load.ts')
const { aggregateCounts, countQuery } = await load('/src/data/build/openDataCounts.ts')
const { pointsQuery, pointsToCountRows } = await load('/src/data/build/openDataPoints.ts')
const placement = await load('/src/data/build/battalionPlacement.ts')
const { geoclientRequest, geoclientPoint } = await load('/src/data/build/geoclient.ts')
const { layerPeriods, periodKey } = await load('/src/data/coverage.ts')
const { datasetFromFile } = await load('/src/data/file.ts')

const layer = getLayer(id)
const kind = layer.build?.kind
if (kind !== 'open-data-counts' && kind !== 'open-data-points' && kind !== 'census-density') throw new Error(`Layer ${id} has no build config`)
const points = kind === 'open-data-points'
const query = points ? pointsQuery : countQuery

const cacheDir = `.cache/layers/${id}`
await mkdir(cacheDir, { recursive: true })

async function fetchMonth(url, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(280_000) })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
      const rows = await res.json()
      if (rows.length >= Number(new URL(url).searchParams.get('$limit'))) throw new Error('response hit the row limit')
      return rows
    } catch (e) {
      if (i >= attempts) throw e
      // The API answers 500/503 under load; give it longer each time.
      console.log(`  retrying in ${10 * i}s (${e.message})`)
      await new Promise((resolve) => setTimeout(resolve, 10_000 * i))
    }
  }
}

// Records with coordinates, and census blocks, are placed in the original NYC Open Data
// boundaries, not the simplified ones the map draws: simplifying leaves slivers where
// neighbouring areas meet, and a point there would land in no area or the wrong one.
const SHAPE_SOURCES = {
  precincts: { url: 'https://data.cityofnewyork.us/resource/y76i-bdw7.geojson?$limit=200', field: 'precinct', property: 'precinct', count: 78 },
  battalions: { url: 'https://data.cityofnewyork.us/resource/xzng-ft6f.geojson?$limit=200', field: 'fire_bn', property: 'battalion', count: 49 },
}
async function shapesOf(geography) {
  const { url, field, property, count } = SHAPE_SOURCES[geography]
  const path = `.cache/shapes/${geography}.geojson`
  let raw = refresh ? null : await readFile(path, 'utf8').then(JSON.parse, () => null)
  if (!raw) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    raw = await res.json()
    await mkdir('.cache/shapes', { recursive: true })
    await writeFile(path, JSON.stringify(raw))
  }
  if (raw.features.length !== count) throw new Error(`${geography}: expected ${count} boundaries, got ${raw.features.length}`)
  return {
    type: 'FeatureCollection',
    features: raw.features.map((f) => ({
      type: 'Feature',
      properties: { [property]: Number(f.properties[field]) },
      geometry: f.geometry.type === 'MultiPolygon' ? f.geometry : { type: 'MultiPolygon', coordinates: [f.geometry.coordinates] },
    })),
  }
}
const fmt = (n) => Math.round(n).toLocaleString('en-US')

/** Checks a built file against its layer and writes it under its geography's name. */
async function writeLayerFile(layer, geography, file) {
  datasetFromFile(layer, file)
  await mkdir('public/data/layers', { recursive: true })
  const path = `public/data/layers/${layerFileName(layer.id, geography)}`
  await writeFile(path, JSON.stringify(file))
  return path
}

if (layer.build?.kind === 'census-density') {
  await buildCensus(layer)
  process.exit(0)
}

/** One month's API response, cached by month and query. */
async function cachedMonth(url, key, dir = cacheDir) {
  const cached = `${dir}/${key}-${createHash('sha256').update(url).digest('hex').slice(0, 12)}.json`
  let batch = refresh ? null : await readFile(cached, 'utf8').then(JSON.parse, () => null)
  if (!batch) {
    const started = Date.now()
    batch = await fetchMonth(url)
    await writeFile(cached, JSON.stringify(batch))
    console.log(`${key}: ${batch.length} groups in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  return batch
}

/** A whole dataset as JSON, cached; for small reference files (alarm boxes, ZIP areas). */
async function cachedJsonUrl(url, path) {
  const hit = refresh ? null : await readFile(path, 'utf8').then(JSON.parse, () => null)
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const value = await res.json()
  await mkdir('.cache/shapes', { recursive: true })
  await writeFile(path, JSON.stringify(value))
  return value
}

/** The Geoclient key from the environment or the gitignored .env.local; null when there is none. */
async function geoclientKey() {
  if (process.env.NYC_GEOCLIENT_KEY) return process.env.NYC_GEOCLIENT_KEY
  const env = await readFile('.env.local', 'utf8').catch(() => '')
  // Quotes around the value are allowed, as in most .env files.
  return env.match(/^NYC_GEOCLIENT_KEY=(.+)$/m)?.[1].trim().replace(/^(['"])(.*)\1$/, '$2') || null
}

/**
 * A layer by battalion from records that only name a precinct and ZIP code. Fires are
 * regrouped by alarm box and placed by the box's published location or geocoded street
 * corner; anything else (all EMS records) is split by where residents of its precinct
 * and ZIP code live, an estimate the file records.
 */
async function buildBattalionsByPlacement(layer, precinctRows) {
  let rows = precinctRows.map((r) => ({ ...r, borough: '', box: '' }))
  if (layer.build.alarmBox) {
    const boxDir = `${cacheDir}/by-box`
    await mkdir(boxDir, { recursive: true })
    rows = []
    for (const period of layerPeriods(layer)) rows.push(...(await cachedMonth(placement.boxQuery(layer.build, period), periodKey(period), boxDir)))
  }

  const boxes = placement.boxLocations(await cachedJsonUrl('https://data.cityofnewyork.us/resource/v57i-gtxb.json?$select=borobox,latitude,longitude&$limit=50000', '.cache/shapes/alarm-boxes.json'))
  const modzcta = await cachedJsonUrl('https://data.cityofnewyork.us/resource/pri4-ifjk.geojson?$limit=500', '.cache/shapes/modzcta.geojson')
  const aliases = new Map()
  const zips = {
    type: 'FeatureCollection',
    features: modzcta.features.map((f) => {
      for (const z of `${f.properties.zcta ?? ''},${f.properties.label ?? ''}`.split(',').map((s) => s.trim()).filter(Boolean)) aliases.set(z, f.properties.modzcta)
      const g = f.geometry
      return { properties: { zip: f.properties.modzcta }, geometry: { coordinates: g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates] } }
    }),
  }
  const blocks = await readFile('.cache/census/nyc-blocks-2020.json', 'utf8').then(JSON.parse, () => {
    throw new Error('No cached census blocks: run npm run data:layer -- population-density first')
  })
  // Community and council districts cut precinct-and-ZIP areas finer, so fewer records are split.
  const districtShapes = async (id, field, path) => {
    const raw = await cachedJsonUrl(`https://data.cityofnewyork.us/resource/${id}.geojson?$limit=500`, path)
    return {
      type: 'FeatureCollection',
      features: raw.features.map((f) => ({
        properties: { district: String(Number(f.properties[field])) },
        geometry: { coordinates: f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates] },
      })),
    }
  }
  const districts = layer.build.districtFields
    ? {
        community: await districtShapes('5crt-au7u', 'boro_cd', '.cache/shapes/community-districts.geojson'),
        council: await districtShapes('872g-cjhh', 'coundist', '.cache/shapes/council-districts.geojson'),
      }
    : {}
  const battalions = await shapesOf('battalions')
  const weights = placement.residentWeights(blocks, { precincts: await shapesOf('precincts'), battalions, zips, ...districts }, aliases)

  // Street corners of boxes missing from the published list, geocoded once and cached.
  const corners = new Map()
  for (const r of rows) {
    const key = placement.alarmBoxKey(r.borough ?? '', r.box ?? '')
    if (key && boxes.has(key)) continue
    const streets = r.location ? placement.intersectionStreets(r.location) : null
    if (streets) corners.set(placement.corneredKey(r.borough, streets), { borough: r.borough, streets })
  }
  const geocodePath = '.cache/geoclient.json'
  const geocodeCache = await readFile(geocodePath, 'utf8').then(JSON.parse, () => ({}))
  const key = corners.size > 0 ? await geoclientKey() : null
  if (key) {
    // Only real answers are cached: a point, or null when Geosupport doesn't know the corner.
    // Rate limits and server errors are retried, and if they persist left uncached, so the
    // next build asks again; --refresh also re-asks corners Geosupport didn't know.
    let asked = 0
    let failed = 0
    for (const [k, { borough, streets }] of corners) {
      if (k in geocodeCache && !(refresh && geocodeCache[k] === null)) continue
      const { url, headers } = geoclientRequest(borough, streets, key)
      let answer
      for (let attempt = 1; attempt <= 5; attempt++) {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) }).catch(() => null)
        if (res && (res.status === 401 || res.status === 403)) throw new Error(`Geoclient refused the key (${res.status}); check NYC_GEOCLIENT_KEY`)
        if (res?.ok) {
          const body = await res.json().catch(() => undefined)
          if (body !== undefined) answer = geoclientPoint(body)
          if (answer !== undefined) break
        } else if (res && res.status >= 400 && res.status < 500 && res.status !== 429) {
          // A request Geoclient rejects outright won't succeed on retry: the corner is unusable.
          answer = null
          break
        }
        if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt))
      }
      if (answer === undefined) failed++
      else geocodeCache[k] = answer
      if (++asked % 200 === 0) {
        await writeFile(geocodePath, JSON.stringify(geocodeCache))
        console.log(`  geocoded ${asked} corners`)
      }
    }
    await writeFile(geocodePath, JSON.stringify(geocodeCache))
    if (failed > 0) console.log(`  ${failed} corners failed after retries and fall back to estimates this build; rerun to retry them.`)
  } else if (corners.size > 0) {
    console.log(`No NYC_GEOCLIENT_KEY: ${corners.size} alarm box corners not in the published list fall back to estimates.`)
  }
  const geocoded = new Map(Object.entries(geocodeCache).filter(([, p]) => p))

  const code = (v) => (v === undefined || v === null || v === '' ? undefined : String(Number(v)))
  const placed = placement.placeInBattalions(
    rows.map((r) => ({ ...r, borough: r.borough ?? '', box: r.box ?? '', cd: code(r.cd), cc: code(r.cc) })),
    { boxes, geocoded, weights, battalions },
  )
  const { file, report } = aggregateCounts(layer, placed.rows, 'battalions')
  file.placement = placement.placementRecord(placed.tally)
  const path = await writeLayerFile(layer, 'battalions', file)
  console.log(`\n${layer.label} by battalions\n| Year | Counted | Not placed |\n|---|---|---|`)
  for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.noPrecinct)} |`)
  for (const p of file.placement) console.log(`  ${(p.share * 100).toFixed(1)}% placed by ${p.method} (${p.exact ? 'exact' : 'estimated'})`)
  console.log(`Wrote ${path}`)
}

const batches = []
for (const period of layerPeriods(layer)) {
  // Keyed by the query too, so changing the layer's filter, fields or parts refetches.
  batches.push(await cachedMonth(query(layer.build, period), periodKey(period)))
}

for (const geography of layerGeographies(layer)) {
  if (geography === 'battalions' && !points) {
    await buildBattalionsByPlacement(layer, batches.flat())
    continue
  }
  const shapes = points ? await shapesOf(geography) : null
  const rows = batches.flatMap((batch) => (points ? pointsToCountRows(batch, shapes, geography) : batch))
  const { file, report } = aggregateCounts(layer, rows, geography)
  const path = await writeLayerFile(layer, geography, file)
  console.log(`\n${layer.label} by ${geography}\n| Year | Counted | Not placed |\n|---|---|---|`)
  for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.noPrecinct)} |`)
  console.log(`\nWrote ${path}`)
}

/** Population density from Census Bureau bulk files, cached in .cache/census/. */
async function buildCensus(layer) {
  const { parseBlock, parseAcsTracts, apportion, densityFile } = await load('/src/data/build/census.ts')
  const { execFile } = await import('node:child_process')
  const { createInterface } = await import('node:readline')
  const { Readable } = await import('node:stream')
  const dir = '.cache/census'
  await mkdir(dir, { recursive: true })
  const cachedJson = async (path, make) => {
    const hit = refresh ? null : await readFile(path, 'utf8').then(JSON.parse, () => null)
    if (hit) return hit
    const value = await make()
    await writeFile(path, JSON.stringify(value))
    return value
  }
  // Streams a URL's lines, keeping the ones `keep` accepts (the files are ~200 MB each).
  async function filterLines(url, keep) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    const kept = []
    for await (const line of createInterface({ input: Readable.fromWeb(res.body) })) if (keep(line, kept.length)) kept.push(line)
    return kept
  }

  const blocks = await cachedJson(`${dir}/nyc-blocks-2020.json`, async () => {
    const zip = `${dir}/ny2020.pl.zip`
    if (!(await readFile(zip).then(() => true, () => false))) {
      console.log(`Downloading ${layer.build.blocks}`)
      const res = await fetch(layer.build.blocks)
      await writeFile(zip, Buffer.from(await res.arrayBuffer()))
    }
    const unzip = execFile('unzip', ['-p', zip, 'nygeo2020.pl'], { maxBuffer: 1 << 30, encoding: 'latin1' })
    const found = []
    for await (const line of createInterface({ input: unzip.stdout })) {
      const b = parseBlock(line)
      if (b) found.push(b)
    }
    return found
  })
  console.log(`2020 blocks in the city: ${blocks.length}, ${blocks.reduce((s, b) => s + b.population, 0).toLocaleString('en-US')} residents`)

  const acsByYear = new Map()
  for (let year = layer.data.firstYear; year <= layer.data.lastYear; year++) {
    const url = layer.build.acs.replaceAll('{year}', String(year))
    const lines = await cachedJson(`${dir}/b01001-${year}.json`, async () => {
      console.log(`Downloading ${url}`)
      return filterLines(url, (line, n) => n === 0 || /^1400000US36(005|047|061|081|085)/.test(line))
    })
    acsByYear.set(year, parseAcsTracts(lines))
  }

  for (const geography of layerGeographies(layer)) {
    const weights = apportion(blocks, await shapesOf(geography), geography)
    console.log(`\nBlocks outside every ${geography === 'battalions' ? 'battalion' : 'precinct'}: ${weights.unplacedBlocks.blocks} (${fmt(weights.unplacedBlocks.population)} residents)`)
    const { file, report } = densityFile(layer, weights, acsByYear, { geography })
    const path = await writeLayerFile(layer, geography, file)
    console.log(`${layer.label} by ${geography}\n| Year | ACS residents placed | In tracts with no 2020 residents |\n|---|---|---|`)
    for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.unplaced)} |`)
    console.log(`Wrote ${path}`)
  }
}
