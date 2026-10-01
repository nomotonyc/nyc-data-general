import { LAYERS, getLayer } from '../layers'
import type { LayerDataset } from './dataset'
import { datasetFromFile, type LayerFile } from './file'
import { generateSampleDataset } from './sample'

type Fetcher = (url: string) => Promise<Response>

/** Where a built layer's data is served from. */
export const layerFileUrl = (layerId: string) => `${import.meta.env.BASE_URL}data/layers/${layerId}.json`

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

  /** Fetches every built layer not yet loaded. Rejects naming the first layer that fails. */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      LAYERS.filter((l) => l.build && !this.cache.has(l.id)).map(async (layer) => {
        const res = await this.fetcher(layerFileUrl(layer.id))
        if (!res.ok) throw new Error(`Couldn’t load ${layer.label} data (${res.status})`)
        let file: LayerFile
        try {
          file = (await res.json()) as LayerFile
        } catch {
          // A dev server answers a missing file with its HTML page.
          throw new Error(`Couldn’t load ${layer.label} data (not a data file; has it been built?)`)
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

  /** True once every built layer is loaded. */
  ready(): boolean {
    return LAYERS.every((l) => !l.build || this.cache.has(l.id))
  }

  add(ds: LayerDataset): void {
    this.cache.set(ds.layerId, ds)
  }

  get(layerId: string): LayerDataset {
    const cached = this.cache.get(layerId)
    if (cached) return cached
    const layer = getLayer(layerId)
    if (layer.build) throw new Error(`Dataset ${layerId} is not loaded yet`)
    const ds = generateSampleDataset(layer)
    this.cache.set(layerId, ds)
    return ds
  }
}

/** The app's datasets. */
export const datasets = new DatasetStore((url) => fetch(url))

/** The dataset behind a layer; built layers must be loaded first (DataGate does this). */
export function getDataset(layerId: string): LayerDataset {
  return datasets.get(layerId)
}
