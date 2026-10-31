import { readdir, readFile, writeFile } from 'node:fs/promises'

const input = JSON.parse(await readFile('SanFrancisco.Neighborhoods.json', 'utf8'))
const city = JSON.parse(await readFile('san-francisco.geojson', 'utf8'))
if (input.type !== 'FeatureCollection' || !Array.isArray(input.features) || input.features.length !== 23) {
  throw new Error('Expected a 23-feature San Francisco neighborhood FeatureCollection')
}

const polygonCoordinates = (geometry) => {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.flatMap((part) => polygonCoordinates(part))
  }
  throw new Error(`Unsupported neighborhood geometry: ${geometry.type}`)
}

const features = input.features.map((feature, index) => {
  const name = feature.properties?.neighborhood
  const zip = String(feature.properties?.id ?? '')
  if (!name || !/^\d{5}$/.test(zip)) throw new Error(`Invalid name or ZIP in neighborhood ${index + 1}`)
  return {
    type: 'Feature',
    properties: { neighborhood: index + 1, name, zip, borough: 'San Francisco' },
    geometry: { type: 'MultiPolygon', coordinates: polygonCoordinates(feature.geometry) },
  }
})

// NYC has no Battalion 5. Use the first 23 existing battalions in the canonical
// dataset order, pairing them one-to-one with San Francisco neighborhoods 1–23.
const sourceBattalions = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26]
features.forEach((feature, index) => {
  feature.properties.sourceBattalion = sourceBattalions[index]
})

await writeFile('public/data/san-francisco-neighborhoods.geojson', JSON.stringify({ type: 'FeatureCollection', features }))
const cityFeature = city.features?.[0]
if (city.type !== 'FeatureCollection' || !cityFeature || cityFeature.geometry?.type !== 'Polygon') {
  throw new Error('Expected a single San Francisco city Polygon')
}
await writeFile('public/data/san-francisco-city.geojson', JSON.stringify({
  type: 'FeatureCollection',
  features: [{ ...cityFeature, properties: { borough: 'San Francisco' } }],
}))
await writeFile('public/data/san-francisco-city-label.geojson', JSON.stringify({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { borough: 'San Francisco' },
    geometry: { type: 'Point', coordinates: [-122.437, 37.76] },
  }],
}))
const areas = features.map(({ properties }) => ({
  id: `hood${properties.neighborhood}`,
  kind: 'neighborhood',
  number: properties.neighborhood,
  label: properties.name,
  borough: properties.borough,
}))
await writeFile(
  'src/domain/neighborhoods.generated.ts',
  `import type { Area } from './geography'\n\nexport const NEIGHBORHOOD_AREAS = ${JSON.stringify(areas, null, 2)} as const satisfies readonly Area[]\n`,
)

const layerFiles = (await readdir('public/data/layers')).filter((name) => name.endsWith('.battalions.json'))
for (const name of layerFiles) {
  const source = JSON.parse(await readFile(`public/data/layers/${name}`, 'utf8'))
  const remap = (record = {}) => Object.fromEntries(sourceBattalions.map((battalion, index) => {
    const value = record[`bn${battalion}`]
    if (value === undefined) throw new Error(`${name}: missing Battalion ${battalion}`)
    return [`hood${index + 1}`, value]
  }))
  const output = {
    layerId: source.layerId,
    geography: 'neighborhoods',
    synthetic: true,
    built: source.built,
    from: source.from,
    to: source.to,
    values: remap(source.values),
    ...(source.denominators ? { denominators: remap(source.denominators) } : {}),
    parts: remap(source.parts),
  }
  await writeFile(`public/data/layers/${source.layerId}.neighborhoods.json`, JSON.stringify(output))
}

console.log(`Normalized ${features.length} San Francisco neighborhoods and mapped ${layerFiles.length} NYC battalion datasets.`)
