import { getLayer } from '../layers'
import type { LayerDataset } from './dataset'
import { generateSampleDataset } from './sample'

const cache = new Map<string, LayerDataset>()

/**
 * The dataset behind a layer. Sample data for now; Milestone 5 swaps in each
 * layer's real data here without changing callers.
 */
export function getDataset(layerId: string): LayerDataset {
  let ds = cache.get(layerId)
  if (!ds) {
    ds = generateSampleDataset(getLayer(layerId))
    cache.set(layerId, ds)
  }
  return ds
}
