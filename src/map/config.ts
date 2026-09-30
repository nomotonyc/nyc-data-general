import type { LngLatBoundsLike } from 'maplibre-gl'

/** Bounding box of the NYC borough geometry: the initial fit and the zoom floor. */
export const NYC_BOUNDS: LngLatBoundsLike = [
  [-74.2556, 40.4961], // south-west
  [-73.7, 40.9155], // north-east
]

export const FIT_PADDING = 40

/** Extra room around the furthest-out view, as a fraction of its span. */
export const MAX_BOUNDS_SLACK = 0.06

export const BOROUGHS_URL = `${import.meta.env.BASE_URL}data/nyc-boroughs.geojson`
export const BOROUGH_LABELS_URL = `${import.meta.env.BASE_URL}data/nyc-borough-labels.geojson`

/** Self-hosted SDF glyphs. Only the 0-255 range ships; borough names are ASCII. */
export const GLYPHS = `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`
export const LABEL_FONT = ['Montserrat']

export const ATTRIBUTION =
  '<a href="https://www.nyc.gov/site/planning/">NYC Dept. of City Planning</a>'

export const SOURCES = { boroughs: 'boroughs', boroughLabels: 'borough-labels' } as const
export const LAYERS = {
  fill: 'borough-fill',
  line: 'borough-line',
  label: 'borough-label',
} as const
