// The built layer files in public/data/layers, as text, for tests (the app fetches them).
const files = import.meta.glob<string>('../../public/data/layers/*.json', { query: '?raw', import: 'default', eager: true })

/** The text of a built layer's file; throws if it has not been built. */
export function layerFileText(layerId: string): string {
  const text = files[`../../public/data/layers/${layerId}.json`]
  if (text === undefined) throw new Error(`No file public/data/layers/${layerId}.json; run npm run data:layer -- ${layerId}`)
  return text
}
