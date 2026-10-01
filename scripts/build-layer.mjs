// Builds a layer's real data from its `build` config: node scripts/build-layer.mjs <layer-id>
// Writes public/data/layers/<id>.json and prints what was counted per year.
import { mkdir, writeFile } from 'node:fs/promises'
import { runnerImport } from 'vite'

const id = process.argv[2]
if (!id) throw new Error('Usage: npm run data:layer -- <layer-id>')

const load = async (path) => (await runnerImport(path, { root: process.cwd(), configFile: false, logLevel: 'silent' })).module
const { getLayer } = await load('/src/layers/index.ts')
const { aggregateCounts, countQuery } = await load('/src/data/build/openDataCounts.ts')
const { datasetFromFile } = await load('/src/data/file.ts')

const layer = getLayer(id)
if (layer.build?.kind !== 'open-data-counts') throw new Error(`Layer ${id} has no Open Data build config`)

const rows = []
for (let year = layer.data.firstYear; year <= layer.data.lastYear; year++) {
  const url = countQuery(layer.build, year)
  const started = Date.now()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${year}: ${res.status} ${await res.text()}`)
  const batch = await res.json()
  if (batch.length >= Number(new URL(url).searchParams.get('$limit'))) throw new Error(`${year}: response hit the row limit`)
  rows.push(...batch)
  console.log(`${year}: ${batch.length} groups in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

const { file, report } = aggregateCounts(layer, rows)
datasetFromFile(layer, file)
await mkdir('public/data/layers', { recursive: true })
await writeFile(`public/data/layers/${id}.json`, JSON.stringify(file))

const fmt = (n) => n.toLocaleString('en-US')
console.log(`\n${layer.label}\n| Year | Counted | No precinct |\n|---|---|---|`)
for (const r of report) console.log(`| ${r.year} | ${fmt(r.counted)} | ${fmt(r.noPrecinct)} |`)
console.log(`\nWrote public/data/layers/${id}.json`)
