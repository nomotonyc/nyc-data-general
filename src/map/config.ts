import type { LngLatBoundsLike } from 'maplibre-gl'

/** Bounding box of the NYC borough geometry: the view the map fits. */
export const NYC_BOUNDS: LngLatBoundsLike = [
  [-74.2556, 40.4961], // south-west
  [-73.7, 40.9155], // north-east
]

export const FIT_PADDING = 40

/**
 * The map never moves on its own: no scroll, drag, keyboard or gesture zoom.
 * The explorer moves it (fit the city, focus a borough).
 */
export const FIXED_VIEW = {
  scrollZoom: false,
  dragPan: false,
  dragRotate: false,
  boxZoom: false,
  doubleClickZoom: false,
  keyboard: false,
  touchZoomRotate: false,
  touchPitch: false,
} as const

export const BOROUGHS_URL = `${import.meta.env.BASE_URL}data/nyc-boroughs.geojson`
export const BOROUGH_LABELS_URL = `${import.meta.env.BASE_URL}data/nyc-borough-labels.geojson`
export const PRECINCTS_URL = `${import.meta.env.BASE_URL}data/nyc-precincts.geojson`
export const PRECINCT_LABELS_URL = `${import.meta.env.BASE_URL}data/nyc-precinct-labels.geojson`

/** Self-hosted SDF glyphs. Only the 0-255 range ships; borough names are ASCII. */
export const GLYPHS = `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`
export const LABEL_FONT = ['Montserrat']

export const ATTRIBUTION =
  '<a href="https://www.nyc.gov/site/planning/">NYC Dept. of City Planning</a>'

export const SOURCES = { boroughs: 'boroughs', boroughLabels: 'borough-labels', precincts: 'precincts' } as const
export const LAYERS = {
  boroughFill: 'borough-fill',
  precinctFill: 'precinct-fill',
  precinctLine: 'precinct-line',
  boroughLine: 'borough-line',
  boroughLabel: 'borough-label',
} as const
