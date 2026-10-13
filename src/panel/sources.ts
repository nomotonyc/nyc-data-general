import { FIREHOUSE_METHOD, FIREHOUSE_SOURCE } from '../data/firehouses'
import { activeMetric, type ExplorerState } from '../explorer/state'
import { BATTALION_BOUNDARIES, layerMethod, layerSources, type Source } from '../layers'
import { firehouseScope } from './firehouses'

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'geography' | 'borough' | 'pinnedArea' | 'showFirehouses'>

/**
 * Where what's on screen comes from, and how it's calculated: the active layer's sources and
 * method, and while firehouses show (as markers, or in the panel's Firehouses section) the
 * firehouse listing and the battalion boundaries it's placed in ("In Battalion 14"). Each once.
 */
export function shownSources(state: Input): { sources: Source[]; method: string[] } {
  const layer = activeMetric(state)
  const firehousesShown = state.showFirehouses || firehouseScope(state) !== null
  const listed = [...layerSources(layer), ...(firehousesShown ? [FIREHOUSE_SOURCE, BATTALION_BOUNDARIES] : [])]
  return {
    sources: listed.filter((s, i) => listed.findIndex((o) => o.url === s.url) === i),
    method: [...layerMethod(layer), ...(firehousesShown ? FIREHOUSE_METHOD : [])],
  }
}
