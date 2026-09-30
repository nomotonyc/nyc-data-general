import { FINAL_YEAR, FINAL_YEAR_LAST_MONTH, STORIES, type StoryId } from '../domain/stories'
import type { Metric, Source } from './types'

export type { Metric, Source } from './types'

// Every *.layer.ts file in this folder is a layer. Adding one needs no other change.
const files = import.meta.glob<{ default: Metric }>('./*.layer.ts', { eager: true })

const storyOrder = (id: StoryId) => STORIES.findIndex((s) => s.id === id)

/** Every layer, by story (chapter order) then by each layer's `order`. */
export const LAYERS: readonly Metric[] = Object.values(files)
  .map((file) => file.default)
  .sort((a, b) => storyOrder(a.story) - storyOrder(b.story) || a.order - b.order)

export function getLayer(id: string): Metric {
  const layer = LAYERS.find((l) => l.id === id)
  if (!layer) throw new Error(`No layer ${id}`)
  return layer
}

/** A story's layers, in picker order. */
export function layersOf(story: StoryId): Metric[] {
  return LAYERS.filter((l) => l.story === story)
}

const PRECINCT_BOUNDARIES: Source = {
  name: 'Police Precincts',
  publisher: 'NYPD, via NYC Open Data',
  url: 'https://data.cityofnewyork.us/d/y76i-bdw7',
  used: 'Precinct boundaries',
}

const BOROUGH_BOUNDARIES: Source = {
  name: 'Borough Boundaries',
  publisher: 'NYC Department of City Planning',
  url: 'https://www.nyc.gov/site/planning/',
  used: 'Borough outlines',
}

/** The layer's own sources, then the boundary credits every layer shares. */
export function layerSources(layer: Metric): Source[] {
  return [...layer.sources, PRECINCT_BOUNDARIES, BOROUGH_BOUNDARIES]
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The layer's own caveats, then the standard ones its data settings call for. */
export function layerMethod(layer: Metric): string[] {
  const method = [...layer.method]
  if (layer.data.areas === 'dispatch') {
    method.push('Precincts 105 and 116 are shown together: the dispatch data does not separate them consistently since NYPD split them in 2024.')
  }
  if (layer.data.lastYear === FINAL_YEAR) {
    method.push(`${FINAL_YEAR} covers January to ${MONTH_NAMES[FINAL_YEAR_LAST_MONTH]}.`)
  }
  return method
}
