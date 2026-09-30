import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { LayerSpecification, SourceSpecification } from 'maplibre-gl'
import type { Theme } from '../theme/tokens'
import {
  ATTRIBUTION,
  BOROUGHS_URL,
  BOROUGH_LABELS_URL,
  LABEL_FONT,
  LAYERS,
  PRECINCTS_URL,
  SOURCES,
} from './config'

/** promoteId lets paintMap address features by borough name and precinct number. */
export function mapSources(): Record<string, SourceSpecification> {
  return {
    [SOURCES.boroughs]: { type: 'geojson', data: BOROUGHS_URL, attribution: ATTRIBUTION, promoteId: 'borough' },
    [SOURCES.boroughLabels]: { type: 'geojson', data: BOROUGH_LABELS_URL },
    [SOURCES.precincts]: { type: 'geojson', data: PRECINCTS_URL, promoteId: 'precinct' },
  }
}

export function mapLayers(theme: Theme): LayerSpecification[] {
  const fill: ExpressionSpecification = ['feature-state', 'fill']
  return [
    {
      id: LAYERS.boroughFill,
      type: 'fill',
      source: SOURCES.boroughs,
      paint: { 'fill-color': ['coalesce', fill, theme.color.boroughFill] },
    },
    {
      // Transparent until paintMap gives a precinct a colour.
      id: LAYERS.precinctFill,
      type: 'fill',
      source: SOURCES.precincts,
      paint: {
        'fill-color': ['coalesce', fill, theme.color.boroughFill],
        'fill-opacity': ['case', ['!=', fill, null], 1, 0],
      },
    },
    {
      id: LAYERS.precinctLine,
      type: 'line',
      source: SOURCES.precincts,
      layout: { visibility: 'none' },
      paint: { 'line-color': theme.color.boroughLine, 'line-width': 0.8, 'line-opacity': 0.8 },
    },
    {
      id: LAYERS.boroughLine,
      type: 'line',
      source: SOURCES.boroughs,
      paint: { 'line-color': theme.color.boroughLine, 'line-width': 2 },
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
      },
    },
  ]
}
