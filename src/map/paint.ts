import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Choropleth } from './choropleth'
import { LAYERS, SOURCES } from './config'

export type PaintableMap = Pick<MapLibreMap, 'setFeatureState' | 'removeFeatureState' | 'setLayoutProperty'>

/** Applies a colour plan and the Show-on-map toggles to the map. */
export function paintMap(map: PaintableMap, plan: Choropleth, show: { outlines: boolean; labels: boolean }) {
  map.removeFeatureState({ source: SOURCES.boroughs })
  map.removeFeatureState({ source: SOURCES.precincts })
  for (const [borough, fill] of Object.entries(plan.boroughs)) {
    map.setFeatureState({ source: SOURCES.boroughs, id: borough }, { fill })
  }
  for (const [precinct, fill] of Object.entries(plan.precincts)) {
    map.setFeatureState({ source: SOURCES.precincts, id: Number(precinct) }, { fill })
  }
  // At precinct level the lines are what separate neighbouring colours.
  const outlines = plan.level === 'precinct' || show.outlines
  map.setLayoutProperty(LAYERS.precinctLine, 'visibility', outlines ? 'visible' : 'none')
  map.setLayoutProperty(LAYERS.boroughLabel, 'visibility', show.labels ? 'visible' : 'none')
}
