import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { GeoJSONSourceSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { FIREHOUSE_COLLECTION } from '../data/firehouses'
import { BOROUGHS, GEOGRAPHIES } from '../domain/geography'
import type { Theme } from '../theme/tokens'
import {
  ATTRIBUTION,
  BOROUGHS_URL,
  BOROUGH_LABELS_URL,
  FADE_DURATION,
  LABEL_FONT,
  GEOGRAPHY_MAP,
  LAYERS,
  SOURCES,
  areaLayers,
  boroughLayers,
} from './config'

/** promoteId lets paintMap address features by borough name and precinct or battalion number. */
export function mapSources(): Record<string, SourceSpecification> {
  const sources: Record<string, SourceSpecification> = {
    [SOURCES.boroughs]: { type: 'geojson', data: BOROUGHS_URL, attribution: ATTRIBUTION, promoteId: 'borough' },
    [SOURCES.boroughLabels]: { type: 'geojson', data: BOROUGH_LABELS_URL },
    // Bundled with the app (the panel counts it too), so no fetch.
    [SOURCES.firehouses]: { type: 'geojson', data: FIREHOUSE_COLLECTION as GeoJSONSourceSpecification['data'], promoteId: 'id' },
  }
  for (const g of GEOGRAPHIES) {
    const { source, labelSource, url, labelsUrl, property } = GEOGRAPHY_MAP[g]
    sources[source] = { type: 'geojson', data: url, promoteId: property }
    sources[labelSource] = { type: 'geojson', data: labelsUrl }
  }
  return sources
}

/**
 * Each borough gets its own fill and line layers. MapLibre animates a layer's
 * opacity but not per-feature state, so this is what lets boroughs and their
 * precincts fade in and out as in the prototype.
 */
export function mapLayers(theme: Theme): LayerSpecification[] {
  const fill: ExpressionSpecification = ['feature-state', 'fill']
  const fade = { duration: FADE_DURATION }
  const inBorough = (b: string): ExpressionSpecification => ['==', ['get', 'borough'], b]

  const boroughFills = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).boroughFill,
    type: 'fill',
    source: SOURCES.boroughs,
    filter: inBorough(b),
    paint: { 'fill-color': ['coalesce', fill, theme.color.boroughFill], 'fill-opacity': 1, 'fill-opacity-transition': fade },
  }))
  // Each geography's areas, per borough; paintMap shows only the current geography's.
  const areaFills = GEOGRAPHIES.flatMap((g) =>
    BOROUGHS.map((b): LayerSpecification => ({
      id: areaLayers(b, g).fill,
      type: 'fill',
      source: GEOGRAPHY_MAP[g].source,
      filter: inBorough(b),
      paint: { 'fill-color': ['coalesce', fill, theme.color.boroughFill], 'fill-opacity': 0, 'fill-opacity-transition': fade },
    })),
  )
  const areaLines = GEOGRAPHIES.flatMap((g) =>
    BOROUGHS.map((b): LayerSpecification => ({
      id: areaLayers(b, g).line,
      type: 'line',
      source: GEOGRAPHY_MAP[g].source,
      filter: inBorough(b),
      paint: { 'line-color': theme.color.boroughLine, 'line-width': 0.8, 'line-opacity': 0, 'line-opacity-transition': fade },
    })),
  )
  const boroughLines = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).boroughLine,
    type: 'line',
    source: SOURCES.boroughs,
    filter: inBorough(b),
    paint: { 'line-color': theme.color.boroughLine, 'line-width': 2, 'line-opacity': 1, 'line-opacity-transition': fade },
  }))

  // Firehouse markers, one step per rank of the highest command housed (see COMMAND_RANKS):
  // a firehouse is a small white dot; a battalion's headquarters larger, with a heavy ring;
  // a division's filled in ink; a borough command's filled and ringed again (firehouseRing).
  // All grow a little as the map zooms into a borough.
  const rank: ExpressionSpecification = ['coalesce', ['get', 'command'], 'none']
  const byRank = (none: number, battalion: number, division: number, borough: number): ExpressionSpecification =>
    ['match', rank, 'battalion', battalion, 'division', division, 'borough', borough, none]
  const filled = (yes: string, no: string): ExpressionSpecification => ['match', rank, ['division', 'borough'], yes, no]
  const zoomed = (at10: ExpressionSpecification, at12: ExpressionSpecification, at14: ExpressionSpecification): ExpressionSpecification =>
    ['interpolate', ['linear'], ['zoom'], 10, at10, 12, at12, 14, at14]
  const markerRadius = zoomed(byRank(3, 4.5, 4.5, 4.5), byRank(4.5, 6, 6, 6), byRank(6, 8, 8, 8))
  const markerRing = zoomed(byRank(1.2, 2.2, 1.4, 1.4), byRank(1.5, 2.6, 1.6, 1.6), byRank(1.8, 3, 1.8, 1.8))
  const marker = {
    'circle-color': filled(theme.color.firehouseRing, theme.color.firehouse),
    'circle-stroke-color': filled(theme.color.firehouse, theme.color.firehouseRing),
  }
  const firehouses = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).firehouse,
    type: 'circle',
    source: SOURCES.firehouses,
    filter: inBorough(b),
    paint: {
      ...marker,
      'circle-radius': markerRadius,
      'circle-stroke-width': markerRing,
      'circle-opacity': 0,
      'circle-stroke-opacity': 0,
      'circle-opacity-transition': fade,
      'circle-stroke-opacity-transition': fade,
    },
  }))
  // The borough commands' outer ring: a circle with no fill (opacity 0 always) and an ink stroke.
  const commandRings = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).firehouseRing,
    type: 'circle',
    source: SOURCES.firehouses,
    filter: ['all', inBorough(b), ['==', ['get', 'command'], 'borough']],
    paint: {
      'circle-color': theme.color.firehouse,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7.5, 12, 9.5, 14, 12],
      'circle-stroke-color': theme.color.firehouseRing,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 14, 1.8],
      'circle-opacity': 0,
      'circle-stroke-opacity': 0,
      'circle-stroke-opacity-transition': fade,
    },
  }))

  return [
    ...boroughFills,
    ...areaFills,
    ...areaLines,
    ...boroughLines,
    {
      // Thin outline on whatever the pointer is over; paintHover sets the filters.
      id: LAYERS.boroughHover,
      type: 'line',
      source: SOURCES.boroughs,
      filter: ['==', ['get', 'borough'], ''],
      paint: { 'line-color': theme.color.ink, 'line-width': 1.8 },
    },
    ...GEOGRAPHIES.flatMap((g): LayerSpecification[] => {
      const { source, property, hover, highlight } = GEOGRAPHY_MAP[g]
      return [
        { id: hover, type: 'line', source, filter: ['in', ['get', property], ['literal', []]], paint: { 'line-color': theme.color.ink, 'line-width': 1.8 } },
        {
          // Outlines the pinned area; paintMap sets the filter.
          id: highlight,
          type: 'line',
          source,
          layout: { visibility: 'none' },
          filter: ['in', ['get', property], ['literal', []]],
          paint: { 'line-color': theme.color.ink, 'line-width': 2.5 },
        },
      ]
    }),
    ...commandRings,
    ...firehouses,
    {
      // The firehouse under the pointer, drawn larger with a heavier ring; paintHover sets the filter.
      id: LAYERS.firehouseHover,
      type: 'circle',
      source: SOURCES.firehouses,
      filter: ['in', ['get', 'id'], ['literal', []]],
      paint: {
        ...marker,
        'circle-radius': zoomed(byRank(5, 6.5, 6.5, 6.5), byRank(6.5, 8, 8, 8), byRank(8, 10, 10, 10)),
        'circle-stroke-width': byRank(2.5, 3.5, 2.5, 2.5),
      },
    },
    {
      id: LAYERS.boroughLabel,
      type: 'symbol',
      source: SOURCES.boroughLabels,
      layout: {
        'text-field': ['get', 'borough'],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 13, 20],
        'text-letter-spacing': 0.14,
        'text-transform': 'uppercase',
      },
      paint: {
        'text-color': theme.color.boroughLabel,
        'text-halo-color': theme.color.boroughLabelHalo,
        'text-halo-width': 1.2,
        'text-opacity': 1,
        'text-opacity-transition': fade,
      },
    },
    // Area numbers inside a focused borough; paintMap sets the filter and shows the current geography's.
    ...GEOGRAPHIES.map((g): LayerSpecification => ({
      id: GEOGRAPHY_MAP[g].label,
      type: 'symbol',
      source: GEOGRAPHY_MAP[g].labelSource,
      layout: {
        'text-field': ['to-string', ['get', GEOGRAPHY_MAP[g].property]],
        'text-font': LABEL_FONT,
        'text-size': 12,
        // Fading numbers never stop the borough names from being placed.
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': theme.color.boroughLabel,
        'text-halo-color': theme.color.boroughLabelHalo,
        'text-halo-width': 1.5,
        'text-opacity': 0,
        'text-opacity-transition': fade,
      },
    })),
  ]
}
