import type { StyleSpecification } from 'maplibre-gl'
import { COLORS, GLYPHS } from './config'

/**
 * A bare style: background only. There is no basemap — the city's own shape is
 * the map, so nothing outside NYC is drawn. Borough layers are added on load.
 */
export function buildStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': COLORS.background } },
    ],
  }
}
