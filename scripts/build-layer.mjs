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
const { getLayer } = await load('/src/layers/index.ts')
const { aggregateCounts, countQuery } = await load('/src/data/build/openDataCounts.ts')
const { pointsQuery, pointsToCountRows } = await load('/src/data/build/openDataPoints.ts')
const { layerPeriods, periodKey } = await load('/src/data/coverage.ts')
const { datasetFromFile } = await load('/src/data/file.ts')

const layer = getLayer(id)
if (layer.build?.kind === 'census-density') {
  await buildCensus(layer)
  process.exit(0)
}
const kind = layer.build?.kind
if (kind !== 'open-data-counts' && kind !== 'open-data-points') throw new Error(`Layer ${id} has no Open Data build config`)
const points = kind === 'open-data-points'
// Records with coordinates are placed in the precincts the map draws.
const shapes = points ? JSON.parse(await readFile('public/data/nyc-precincts.geojson', 'utf8')) : null
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

const rows = []
for (const period of layerPeriods(layer)) {
  const key = periodKey(period)
  const url = query(layer.build, period)
  // Keyed by the query too, so changing the layer's filter, fields or parts refetches.
  const cached = `${cacheDir}/${key}-${createHash('sha256').update(url).digest('hex').slice(0, 12)}.json`
  let batch = refresh ? null : await readFile(cached, 'utf8').then(JSON.parse, () => null)
  if (!batch) {
    const started = Date.now()
    batch = await fetchMonth(url)
    await writeFile(cached, JSON.stringify(batch))
    console.log(`${key}: ${batch.length} groups in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  rows.push(...(points ? pointsToCountRows(batch, shapes) : batch))
}

const { file, report } = aggregateCounts(layer, rows)
datasetFromFile(layer, file)
await mkdir('public/data/layers', { recursive: true })
await writeFile(`public/data/layers/${id}.json`, JSON.stringify(file))

const fmt = (n) => n.toLocaleString('en-US')
console.log(`\n${layer.label}\n| Year | Counted | No precinct |\n|---|---|---|`)
for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.noPrecinct)} |`)
console.log(`\nWrote public/data/layers/${id}.json`)

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

  const shapes = JSON.parse(await readFile('public/data/nyc-precincts.geojson', 'utf8'))
  const weights = apportion(blocks, shapes)
  console.log(`Blocks outside every precinct: ${weights.unplacedBlocks.blocks} (${weights.unplacedBlocks.population.toLocaleString('en-US')} residents)`)

  const acsByYear = new Map()
  for (let year = layer.data.firstYear; year <= layer.data.lastYear; year++) {
    const url = layer.build.acs.replaceAll('{year}', String(year))
    const lines = await cachedJson(`${dir}/b01001-${year}.json`, async () => {
      console.log(`Downloading ${url}`)
      return filterLines(url, (line, n) => n === 0 || /^1400000US36(005|047|061|081|085)/.test(line))
    })
    acsByYear.set(year, parseAcsTracts(lines))
  }

  const { file, report } = densityFile(layer, weights, acsByYear)
  datasetFromFile(layer, file)
  await mkdir('public/data/layers', { recursive: true })
  await writeFile(`public/data/layers/${layer.id}.json`, JSON.stringify(file))
  const fmt = (n) => Math.round(n).toLocaleString('en-US')
  console.log(`\n${layer.label}\n| Year | ACS residents placed | In tracts with no 2020 residents |\n|---|---|---|`)
  for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.unplaced)} |`)
  console.log(`\nWrote public/data/layers/${layer.id}.json`)
}
