// Builds a layer's real data from its `build` config: node scripts/build-layer.mjs <layer-id>
// Writes public/data/layers/<id>.json and prints what was counted per year. Each month's API
// response is cached in .cache/layers/<id>/, so a rerun only fetches what it doesn't have;
// pass --refresh to fetch everything again.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { runnerImport } from 'vite'

const id = process.argv[2]
const refresh = process.argv.includes('--refresh')
if (!id) throw new Error('Usage: npm run data:layer -- <layer-id> [--refresh]')

const load = async (path) => (await runnerImport(path, { root: process.cwd(), configFile: false, logLevel: 'silent' })).module
const { getLayer } = await load('/src/layers/index.ts')
const { aggregateCounts, countQuery } = await load('/src/data/build/openDataCounts.ts')
const { layerPeriods, periodKey } = await load('/src/data/coverage.ts')
const { datasetFromFile } = await load('/src/data/file.ts')

const layer = getLayer(id)
if (layer.build?.kind !== 'open-data-counts') throw new Error(`Layer ${id} has no Open Data build config`)

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
  const cached = `${cacheDir}/${key}.json`
  let batch = refresh ? null : await readFile(cached, 'utf8').then(JSON.parse, () => null)
  if (!batch) {
    const started = Date.now()
    batch = await fetchMonth(countQuery(layer.build, period))
    await writeFile(cached, JSON.stringify(batch))
    console.log(`${key}: ${batch.length} groups in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  rows.push(...batch)
}

const { file, report } = aggregateCounts(layer, rows)
datasetFromFile(layer, file)
await mkdir('public/data/layers', { recursive: true })
await writeFile(`public/data/layers/${id}.json`, JSON.stringify(file))

const fmt = (n) => n.toLocaleString('en-US')
console.log(`\n${layer.label}\n| Year | Counted | No precinct |\n|---|---|---|`)
for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.noPrecinct)} |`)
console.log(`\nWrote public/data/layers/${id}.json`)
