import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { BOROUGHS } from '../domain/geography'
import type { Theme } from '../theme/tokens'
import {
  ATTRIBUTION,
  BOROUGHS_URL,
  BOROUGH_LABELS_URL,
  FADE_DURATION,
  LABEL_FONT,
  LAYERS,
  PRECINCTS_URL,
  PRECINCT_LABELS_URL,
  SOURCES,
  boroughLayers,
} from './config'

/** promoteId lets paintMap address features by borough name and precinct number. */
export function mapSources(): Record<string, SourceSpecification> {
  return {
    [SOURCES.boroughs]: { type: 'geojson', data: BOROUGHS_URL, attribution: ATTRIBUTION, promoteId: 'borough' },
    [SOURCES.boroughLabels]: { type: 'geojson', data: BOROUGH_LABELS_URL },
    [SOURCES.precincts]: { type: 'geojson', data: PRECINCTS_URL, promoteId: 'precinct' },
    [SOURCES.precinctLabels]: { type: 'geojson', data: PRECINCT_LABELS_URL },
  }
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
  const precinctFills = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).precinctFill,
    type: 'fill',
    source: SOURCES.precincts,
    filter: inBorough(b),
    paint: { 'fill-color': ['coalesce', fill, theme.color.boroughFill], 'fill-opacity': 0, 'fill-opacity-transition': fade },
  }))
  const precinctLines = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).precinctLine,
    type: 'line',
    source: SOURCES.precincts,
    filter: inBorough(b),
    paint: { 'line-color': theme.color.boroughLine, 'line-width': 0.8, 'line-opacity': 0, 'line-opacity-transition': fade },
  }))
  const boroughLines = BOROUGHS.map((b): LayerSpecification => ({
    id: boroughLayers(b).boroughLine,
    type: 'line',
    source: SOURCES.boroughs,
    filter: inBorough(b),
    paint: { 'line-color': theme.color.boroughLine, 'line-width': 2, 'line-opacity': 1, 'line-opacity-transition': fade },
  }))

  return [
    ...boroughFills,
    ...precinctFills,
    ...precinctLines,
    ...boroughLines,
    {
      // Thin outline on whatever the pointer is over; paintHover sets the filters.
      id: LAYERS.boroughHover,
      type: 'line',
      source: SOURCES.boroughs,
      filter: ['==', ['get', 'borough'], ''],
      paint: { 'line-color': theme.color.ink, 'line-width': 1.8 },
    },
    {
      id: LAYERS.precinctHover,
      type: 'line',
      source: SOURCES.precincts,
      filter: ['in', ['get', 'precinct'], ['literal', []]],
      paint: { 'line-color': theme.color.ink, 'line-width': 1.8 },
    },
    {
      // Outlines the pinned precinct (both halves of a merged area); paintMap sets the filter.
      id: LAYERS.precinctHighlight,
      type: 'line',
      source: SOURCES.precincts,
      layout: { visibility: 'none' },
      filter: ['in', ['get', 'precinct'], ['literal', []]],
      paint: { 'line-color': theme.color.ink, 'line-width': 2.5 },
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
    {
      // Precinct numbers inside a focused borough; paintMap sets the filter.
      id: LAYERS.precinctLabel,
      type: 'symbol',
      source: SOURCES.precinctLabels,
      layout: {
        'text-field': ['to-string', ['get', 'precinct']],
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
    },
  ]
}
