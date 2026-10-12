import type { LayerDataset } from '../data/dataset'
import { FIREHOUSE_SOURCE, LISTING_UPDATED } from '../data/firehouses'
import { effectiveRange } from '../data/selectors'
import { areaById, areaNoun } from '../domain/geography'
import { rangeLabel } from '../domain/stories'
import { activeMetric, effectiveDetail, type ExplorerState } from '../explorer/state'
import { BATTALION_BOUNDARIES, layerSources, type Source } from '../layers'

/**
 * What a picture shows, which decides what its caption says: the place in focus (the summary,
 * the breakdown, the trend); the five boroughs compared; the highest areas of a borough or the
 * city; the map; or the firehouses of a borough or battalion.
 */
export type PictureOf = 'focus' | 'boroughs' | 'areas' | 'map' | 'firehouses'

export type Caption = { title: string; credit: string; name: string }

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'geography' | 'borough' | 'detail' | 'pinnedArea' | 'showFirehouses' | 'yearFrom' | 'yearTo'>

/**
 * What a saved picture carries that the screen shows elsewhere: above it, what it shows ("Structural
 * fires by battalion · Queens · 2025"); below it, who published that data; and a file name.
 */
export function pictureCaption(of: PictureOf, state: Input, ds: LayerDataset): Caption {
  if (of === 'firehouses') {
    const title = `FDNY firehouse listing · updated ${LISTING_UPDATED}`
    return { title, credit: creditFor([FIREHOUSE_SOURCE, BATTALION_BOUNDARIES]), name: slug(`listing ${LISTING_UPDATED}`) }
  }
  const layer = activeMetric(state)
  const { range } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const area = areaNoun(state.geography).one
  const city = state.borough ?? 'New York City'
  const parts =
    of === 'boroughs'
      ? [`${layer.label} by borough`]
      : of === 'areas'
        ? [`${layer.label} by ${area}`, city]
        : of === 'map'
          ? [`${layer.label} by ${effectiveDetail(state) === 'borough' ? 'borough' : area}`, city]
          : [`${layer.label} by ${area}`, state.pinnedArea !== null ? areaById(ds.areas, state.pinnedArea).label : city]
  parts.push(rangeLabel(range))
  // The map shows firehouses when they're on, placed in battalion areas.
  const sources = [...layerSources(layer), ...(of === 'map' && state.showFirehouses ? [FIREHOUSE_SOURCE, BATTALION_BOUNDARIES] : [])]
  return { title: parts.join(' · '), credit: creditFor(sources), name: slug(parts.join(' ')) }
}

/** What's on screen, as far as a picture goes: one saved under another view is out of date. */
export function pictureView(state: Input): string {
  const { storyId, metricId, geography, borough, detail, pinnedArea, showFirehouses, yearFrom, yearTo } = state
  return [storyId, metricId, geography, borough, detail, pinnedArea, showFirehouses, yearFrom, yearTo].join('|')
}

const VIA_OPEN_DATA = ', via NYC Open Data'

/**
 * Who published the data: each once, those that came through NYC Open Data named together with it,
 * so nothing published directly (the Census Bureau) reads as via it.
 */
export function creditFor(sources: readonly Source[]): string {
  const publishers = [...new Set(sources.map((s) => s.publisher))]
  const via = [...new Set(publishers.filter((p) => p.endsWith(VIA_OPEN_DATA)).map((p) => p.slice(0, -VIA_OPEN_DATA.length)))]
  const direct = publishers.filter((p) => !p.endsWith(VIA_OPEN_DATA))
  return `Data: ${[...(via.length ? [`${via.join(', ')} via NYC Open Data`] : []), ...direct].join(' · ')}`
}

/** Words as a file name: "Structural fires · Queens" → structural-fires-queens. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
