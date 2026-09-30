import type { LngLatBoundsLike } from 'maplibre-gl'

/** Bounding box of the NYC borough geometry: the view the map fits. */
export const NYC_BOUNDS: LngLatBoundsLike = [
  [-74.2556, 40.4961], // south-west
  [-73.7, 40.9155], // north-east
]

/** Room around the whole city. The land nearest the legend's corner (the Rockaways) sits well above its lowest point. */
export const CITY_PADDING = { top: 24, right: 24, bottom: 24, left: 24 }

/** Room around a focused borough; the bottom clears the legend card, since a borough's land can reach that corner. */
export const BOROUGH_PADDING = { top: 24, right: 24, bottom: 100, left: 24 }

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

export const SOURCES = {
  boroughs: 'boroughs',
  boroughLabels: 'borough-labels',
  precincts: 'precincts',
  precinctLabels: 'precinct-labels',
} as const
/** City-wide layers. Borough and precinct shapes have one layer set per borough (boroughLayers). */
export const LAYERS = {
  boroughHover: 'borough-hover',
  precinctHover: 'precinct-hover',
  precinctHighlight: 'precinct-highlight',
  boroughLabel: 'borough-label',
  precinctLabel: 'precinct-label',
} as const

/** Each borough's own layers, so it can fade in and out by itself. */
export function boroughLayers(borough: string) {
  const slug = borough.toLowerCase().replace(/\s+/g, '-')
  return {
    boroughFill: `borough-fill-${slug}`,
    precinctFill: `precinct-fill-${slug}`,
    precinctLine: `precinct-line-${slug}`,
    boroughLine: `borough-line-${slug}`,
  }
}

/** How long the camera takes to glide between the city and a borough. */
export const FLY_DURATION = 1000

/** How long the pointer must rest on a place before its hover card appears. */
export const HOVER_DELAY = 300

/** How long areas and labels take to fade in or out (as in the prototype). */
export const FADE_DURATION = 450
