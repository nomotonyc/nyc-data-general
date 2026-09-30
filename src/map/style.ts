import type { StyleSpecification } from 'maplibre-gl'
import type { Theme } from '../theme/tokens'
import { GLYPHS } from './config'

/** Background only — no basemap. Borough layers are added on style load. */
export function buildStyle(theme: Theme): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': theme.color.background },
      },
    ],
  }
}
