import type { Geography } from '../domain/geography'
import { layerFileName } from '../data/load'

// The built layer files in public/data/layers, as text, for tests (the app fetches them).
const files = import.meta.glob<string>('../../public/data/layers/*.json', { query: '?raw', import: 'default', eager: true })
const path = (layerId: string, geography: Geography) => `../../public/data/layers/${layerFileName(layerId, geography)}`

/** The text of a built layer's file for a geography; throws if it has not been built. */
export function layerFileText(layerId: string, geography: Geography = 'precincts'): string {
  const text = files[path(layerId, geography)]
  if (text === undefined) throw new Error(`No file public/data/layers/${layerFileName(layerId, geography)}; run npm run data:layer -- ${layerId}`)
  return text
}

/** Whether a layer's file for a geography has been built. */
export function hasLayerFile(layerId: string, geography: Geography = 'precincts'): boolean {
  return path(layerId, geography) in files
}
