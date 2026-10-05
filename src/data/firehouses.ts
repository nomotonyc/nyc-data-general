import type { Firehouse } from '../domain/firehouses'
import type { Source } from '../layers'
import file from './firehouses.json'

/** Built by `npm run data:firehouses`; the map draws it and the panel counts it. */
export const FIREHOUSE_COLLECTION = file as unknown as {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: Firehouse; geometry: { type: 'Point'; coordinates: [number, number] } }[]
  /** When the city last updated the listing, YYYY-MM-DD. */
  updated: string
}

export const FIREHOUSES: readonly Firehouse[] = FIREHOUSE_COLLECTION.features.map((f) => f.properties)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function firehouseSourceUsed(updated: string): string {
  const [year, month] = updated.split('-').map(Number)
  return `Firehouse locations and units, as the city last updated them in ${MONTHS[month - 1]} ${year}`
}

/** Credited in Data sources whenever firehouses are on screen. */
export const FIREHOUSE_SOURCE: Source = {
  name: 'FDNY Firehouse Listing',
  publisher: 'FDNY, via NYC Open Data',
  url: 'https://data.cityofnewyork.us/d/hc8x-tcnd',
  used: firehouseSourceUsed(FIREHOUSE_COLLECTION.updated),
}

const [updatedYear, updatedMonth] = FIREHOUSE_COLLECTION.updated.split('-').map(Number)

/** Shown under "How this is calculated" whenever firehouses are on screen. */
export const FIREHOUSE_METHOD: readonly string[] = [
  'Firehouse markers show the highest command each firehouse houses: a battalion (run by a battalion chief), a division (a deputy chief, over several battalions) or a borough command (an assistant chief).',
  'Each marker is placed on the building the listing names; locations were checked against the city’s building footprints and NYC Geoclient.',
  'Firehouse counts are of where firehouses stand, which is close to, but not the same as, the companies FDNY assigns to a battalion.',
  `The listing was last updated in ${MONTHS[updatedMonth - 1]} ${updatedYear}; units that opened, closed or moved since are not shown.`,
]
