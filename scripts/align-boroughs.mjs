// Moves pieces of the borough outlines to the borough whose precincts cover them (see
// src/data/build/alignBoroughs.ts): node scripts/align-boroughs.mjs
// Run after npm run data:precincts. Rewrites public/data/nyc-boroughs.geojson in place.
import { readFile, writeFile } from 'node:fs/promises'
import { runnerImport } from 'vite'

const { module } = await runnerImport('/src/data/build/alignBoroughs.ts', { root: process.cwd(), configFile: false, logLevel: 'silent' })
const path = 'public/data/nyc-boroughs.geojson'
const boroughs = JSON.parse(await readFile(path, 'utf8'))
const precincts = JSON.parse(await readFile('public/data/nyc-precincts.geojson', 'utf8'))
const aligned = module.alignBoroughs(boroughs, precincts)
for (const [before, after] of boroughs.features.map((f, i) => [f, aligned.features[i]])) {
  console.log(`${before.properties.borough}: ${before.geometry.coordinates.length} pieces -> ${after.geometry.coordinates.length}`)
}
await writeFile(path, JSON.stringify(aligned))
