import type { Geography } from '../domain/geography'
import { FINAL_YEAR, FINAL_YEAR_LAST_MONTH, STORIES, type StoryId } from '../domain/stories'
import type { Metric, Source } from './types'

export type { CensusDensityBuild, Metric, OpenDataCountsBuild, OpenDataPointsBuild, Source } from './types'

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

const BATTALION_BOUNDARIES: Source = {
  name: 'Fire Battalions',
  publisher: 'FDNY, via NYC Open Data',
  url: 'https://data.cityofnewyork.us/d/xzng-ft6f',
  used: 'Battalion boundaries',
}

// What places precinct-recorded counts in battalions (see data-sources.md, "By battalion").
const ALARM_BOXES: Source = {
  name: 'In-Service Alarm Box Locations',
  publisher: 'FDNY, via NYC Open Data',
  url: 'https://data.cityofnewyork.us/d/v57i-gtxb',
  used: 'Battalion placement: where each alarm box is',
}

const GEOCLIENT: Source = {
  name: 'Geoclient',
  publisher: 'NYC Department of City Planning and OTI',
  url: 'https://github.com/CityOfNewYork/geoclient',
  used: 'Battalion placement: street corners of alarm boxes not in the list above',
}

const RESIDENT_SOURCES: Source[] = [
  {
    name: '2020 Census Redistricting Data (P.L. 94-171)',
    publisher: 'U.S. Census Bureau',
    url: 'https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/ny2020.pl.zip',
    used: 'Battalion estimates: residents of each census block',
  },
  {
    name: 'Modified ZIP Code Tabulation Areas (MODZCTA)',
    publisher: 'NYC Department of Health, via NYC Open Data',
    url: 'https://data.cityofnewyork.us/d/pri4-ifjk',
    used: 'Battalion estimates: ZIP code areas',
  },
  {
    name: 'Community Districts',
    publisher: 'NYC Department of City Planning, via NYC Open Data',
    url: 'https://data.cityofnewyork.us/d/5crt-au7u',
    used: 'Battalion estimates: community district areas',
  },
  {
    name: 'City Council Districts',
    publisher: 'NYC Department of City Planning, via NYC Open Data',
    url: 'https://data.cityofnewyork.us/d/872g-cjhh',
    used: 'Battalion estimates: council district areas',
  },
]

/** The datasets that place a layer's records in battalions, beyond the battalion boundaries. */
function placementSources(layer: Metric): Source[] {
  if (!layerGeographies(layer).includes('battalions') || layer.build?.kind !== 'open-data-counts') return []
  return [...(layer.build.alarmBox ? [ALARM_BOXES, GEOCLIENT] : []), ...RESIDENT_SOURCES]
}

/**
 * The layer's own sources, then the boundary credits (precincts and boroughs always, battalions
 * when it has them), then whatever places its records in battalions. Each dataset is listed once.
 */
export function layerSources(layer: Metric): Source[] {
  const battalions = layerGeographies(layer).includes('battalions') ? [BATTALION_BOUNDARIES] : []
  const all = [...layer.sources, PRECINCT_BOUNDARIES, ...battalions, BOROUGH_BOUNDARIES, ...placementSources(layer)]
  return all.filter((s, i) => all.findIndex((o) => o.url === s.url) === i)
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The layer's own caveats, then the standard ones its data settings call for. */
export function layerMethod(layer: Metric): string[] {
  const method = [...layer.method]
  if (layer.build?.kind === 'open-data-counts') {
    method.push('Precincts 105 and 116 are told apart by ZIP code: NYPD created 116 from 105 in late 2024, and older records still say 105.')
  }
  if (layer.data.lastYear === FINAL_YEAR) {
    method.push(`${FINAL_YEAR} covers January to ${MONTH_NAMES[FINAL_YEAR_LAST_MONTH]}.`)
  }
  return method
}

/** The geographies a layer can be shown in. */
export function layerGeographies(layer: Pick<Metric, 'geographies'>): readonly Geography[] {
  return layer.geographies ?? ['precincts']
}
