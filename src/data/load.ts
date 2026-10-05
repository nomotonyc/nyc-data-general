import type { Geography } from '../domain/geography'
import { LAYERS, getLayer, layerGeographies } from '../layers'
import type { LayerDataset } from './dataset'
import { datasetFromFile, type LayerFile } from './file'
import { generateSampleDataset } from './sample'

type Fetcher = (url: string) => Promise<Response>

/** A built layer's file name for a geography: `<id>.json` for precincts, `<id>.battalions.json` for battalions. */
export const layerFileName = (layerId: string, geography: Geography = 'precincts') =>
  geography === 'precincts' ? `${layerId}.json` : `${layerId}.${geography}.json`

/** Where a built layer's data is served from. */
export const layerFileUrl = (layerId: string, geography: Geography = 'precincts') =>
  `${import.meta.env.BASE_URL}data/layers/${layerFileName(layerId, geography)}`

/** Every (layer, geography) pair that has a built file. */
const builtFiles = () => LAYERS.filter((l) => l.build).flatMap((layer) => layerGeographies(layer).map((geography) => ({ layer, geography })))
const key = (layerId: string, geography: Geography) => `${layerId}|${geography}`

/**
 * Datasets by layer: real data for layers with a build config, fetched and checked by
 * `load()`; generated sample data for the rest.
 */
export class DatasetStore {
  private readonly cache = new Map<string, LayerDataset>()
  private loading: Promise<void> | null = null
  private readonly fetcher: Fetcher

  constructor(fetcher: Fetcher) {
    this.fetcher = fetcher
  }

  /** Fetches every built layer and geography not yet loaded. Rejects naming the first that fails. */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      builtFiles().filter(({ layer, geography }) => !this.cache.has(key(layer.id, geography))).map(async ({ layer, geography }) => {
        const res = await this.fetcher(layerFileUrl(layer.id, geography))
        const what = geography === 'precincts' ? `${layer.label} data` : `${layer.label} data by ${geography === 'battalions' ? 'battalion' : geography}`
        if (!res.ok) throw new Error(`Couldn’t load ${what} (${res.status})`)
        let file: LayerFile
        try {
          file = (await res.json()) as LayerFile
        } catch {
          // A dev server answers a missing file with its HTML page.
          throw new Error(`Couldn’t load ${what} (not a data file; has it been built?)`)
        }
        // A file is trusted only for the geography it was fetched as.
        if ((file.geography ?? 'precincts') !== geography) {
          throw new Error(`Dataset ${layer.id}: ${layerFileUrl(layer.id, geography)} holds ${file.geography ?? 'precincts'}, expected ${geography}`)
        }
        this.add(datasetFromFile(layer, file))
      }),
    )
      .then(() => undefined)
      .finally(() => {
        this.loading = null
      })
    return this.loading
  }

  /** True once every built layer and geography is loaded. */
  ready(): boolean {
    return builtFiles().every(({ layer, geography }) => this.cache.has(key(layer.id, geography)))
  }

  add(ds: LayerDataset): void {
    this.cache.set(key(ds.layerId, ds.geography), ds)
  }

  get(layerId: string, geography: Geography = 'precincts'): LayerDataset {
    const cached = this.cache.get(key(layerId, geography))
    if (cached) return cached
    const layer = getLayer(layerId)
    if (!layerGeographies(layer).includes(geography)) throw new Error(`Dataset ${layerId} has no ${geography}`)
    if (layer.build) throw new Error(`Dataset ${layerId} (${geography}) is not loaded yet`)
    const ds = generateSampleDataset(layer, geography)
    this.cache.set(key(layerId, geography), ds)
    return ds
  }
}

/** The app's datasets. */
export const datasets = new DatasetStore((url) => fetch(url))

/** The dataset behind a layer in a geography; built layers must be loaded first (DataGate does this). */
export function getDataset(layerId: string, geography: Geography = 'precincts'): LayerDataset {
  return datasets.get(layerId, geography)
}
