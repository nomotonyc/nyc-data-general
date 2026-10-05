import type { LngLatBoundsLike } from 'maplibre-gl'
import type { Geography } from '../domain/geography'

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
export const BATTALIONS_URL = `${import.meta.env.BASE_URL}data/nyc-battalions.geojson`
export const BATTALION_LABELS_URL = `${import.meta.env.BASE_URL}data/nyc-battalion-labels.geojson`

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
  battalions: 'battalions',
  battalionLabels: 'battalion-labels',
  firehouses: 'firehouses',
} as const
/** City-wide layers. Borough and precinct shapes have one layer set per borough (boroughLayers). */
export const LAYERS = {
  boroughHover: 'borough-hover',
  precinctHover: 'precinct-hover',
  precinctHighlight: 'precinct-highlight',
  boroughLabel: 'borough-label',
  precinctLabel: 'precinct-label',
  battalionHover: 'battalion-hover',
  battalionHighlight: 'battalion-highlight',
  battalionLabel: 'battalion-label',
  firehouseHover: 'firehouse-hover',
} as const

/** Per geography: its shape and label sources, the feature property holding the area number, and its city-wide layers. */
export const GEOGRAPHY_MAP = {
  precincts: {
    source: SOURCES.precincts,
    labelSource: SOURCES.precinctLabels,
    url: PRECINCTS_URL,
    labelsUrl: PRECINCT_LABELS_URL,
    property: 'precinct',
    hover: LAYERS.precinctHover,
    highlight: LAYERS.precinctHighlight,
    label: LAYERS.precinctLabel,
  },
  battalions: {
    source: SOURCES.battalions,
    labelSource: SOURCES.battalionLabels,
    url: BATTALIONS_URL,
    labelsUrl: BATTALION_LABELS_URL,
    property: 'battalion',
    hover: LAYERS.battalionHover,
    highlight: LAYERS.battalionHighlight,
    label: LAYERS.battalionLabel,
  },
} as const satisfies Record<Geography, unknown>

/** Each borough's own layers, so it can fade in and out by itself. */
export function boroughLayers(borough: string) {
  const slug = borough.toLowerCase().replace(/\s+/g, '-')
  return {
    boroughFill: `borough-fill-${slug}`,
    precinctFill: `precinct-fill-${slug}`,
    precinctLine: `precinct-line-${slug}`,
    battalionFill: `battalion-fill-${slug}`,
    battalionLine: `battalion-line-${slug}`,
    boroughLine: `borough-line-${slug}`,
    firehouse: `firehouse-${slug}`,
    firehouseRing: `firehouse-ring-${slug}`,
  }
}

/** A borough's fill and line layers for one geography's areas. */
export function areaLayers(borough: string, geography: Geography) {
  const layers = boroughLayers(borough)
  return geography === 'battalions'
    ? { fill: layers.battalionFill, line: layers.battalionLine }
    : { fill: layers.precinctFill, line: layers.precinctLine }
}

/** How long the camera takes to glide between the city and a borough. */
export const FLY_DURATION = 1000

/** How long the pointer must rest on a place before its hover card appears. */
export const HOVER_DELAY = 300

/** How long areas and labels take to fade in or out (as in the prototype). */
export const FADE_DURATION = 450
