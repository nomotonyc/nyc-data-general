import type { LngLatBoundsLike } from 'maplibre-gl'

/** Bounding box of the NYC borough geometry. */
export const NYC_BOUNDS: LngLatBoundsLike = [
  [-74.2556, 40.4961], // south-west
  [-73.7, 40.9155], // north-east
]

export const FIT_PADDING = 40

/** Panning limit. Looser than NYC_BOUNDS, which sets the zoom floor, not the pan floor. */
export const MAX_BOUNDS: LngLatBoundsLike = [
  [-74.6, 40.25],
  [-73.36, 41.15],
]

export const BOROUGHS_URL = `${import.meta.env.BASE_URL}data/nyc-boroughs.geojson`
export const BOROUGH_LABELS_URL = `${import.meta.env.BASE_URL}data/nyc-borough-labels.geojson`

/**
 * Self-hosted SDF glyphs, so the map has no third-party runtime dependency.
 * Only the 0-255 range is shipped; borough names are ASCII.
 */
export const GLYPHS = `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`
export const LABEL_FONT = ['Montserrat']

export const ATTRIBUTION =
  '<a href="https://www.nyc.gov/site/planning/">NYC Dept. of City Planning</a>'

/** Borough fill is flat and neutral: it is the surface data will later colour. */
export const COLORS = {
  background: '#ffffff',
  fill: '#dde3ea',
  line: '#ffffff',
  label: '#39414c',
  labelHalo: '#ffffff',
} as const

export const SOURCES = { boroughs: 'boroughs', boroughLabels: 'borough-labels' } as const
export const LAYERS = {
  fill: 'borough-fill',
  line: 'borough-line',
  label: 'borough-label',
} as const
