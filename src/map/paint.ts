import type { Map as MapLibreMap } from 'maplibre-gl'
import { BOROUGHS, PRECINCTS, areaOfPrecinct, type Area } from '../domain/geography'
import type { Choropleth } from './choropleth'
import { LAYERS, SOURCES, boroughLayers } from './config'
import type { Target } from './interaction'

export type PaintableMap = Pick<MapLibreMap, 'setFeatureState' | 'setLayoutProperty' | 'setPaintProperty' | 'setFilter'>

export type Show = {
  outlines: boolean
  labels: boolean
  /** Precincts of the pinned area (two for 105 & 116 in dispatch data), or none. */
  pinned: readonly number[]
}

/** Applies a colour plan, the focus, the pin and the Show-on-map toggles to the map. */
export function paintMap(map: PaintableMap, plan: Choropleth, show: Show) {
  // Every feature gets its fill (or none) each time, so nothing is left over from before.
  for (const b of BOROUGHS) map.setFeatureState({ source: SOURCES.boroughs, id: b }, { fill: plan.boroughs[b] ?? null })
  for (const p of PRECINCTS) map.setFeatureState({ source: SOURCES.precincts, id: p }, { fill: plan.precincts[p] ?? null })

  // Opacity, not visibility: the layers fade (FADE_DURATION). A focused borough
  // stands alone while the rest of the city fades out.
  for (const b of BOROUGHS) {
    const layers = boroughLayers(b)
    const shown = plan.focus === null || plan.focus === b
    const precinctsColoured = shown && plan.level === 'precinct'
    // At precinct level the lines are what separate neighbouring colours.
    const outlines = shown && (plan.level === 'precinct' || show.outlines)
    map.setPaintProperty(layers.boroughFill, 'fill-opacity', shown ? 1 : 0)
    map.setPaintProperty(layers.boroughLine, 'line-opacity', shown ? 1 : 0)
    map.setPaintProperty(layers.precinctFill, 'fill-opacity', precinctsColoured ? 1 : 0)
    map.setPaintProperty(layers.precinctLine, 'line-opacity', outlines ? 0.8 : 0)
  }

  map.setPaintProperty(LAYERS.boroughLabel, 'text-opacity', show.labels && plan.focus === null ? 1 : 0)
  map.setPaintProperty(LAYERS.precinctLabel, 'text-opacity', show.labels && plan.focus !== null ? 1 : 0)
  // Only the focused borough's numbers are placed; at city level none are, since
  // invisible labels still take up room and would crowd out the borough names.
  map.setFilter(LAYERS.precinctLabel, ['==', ['get', 'borough'], plan.focus ?? ''])

  map.setLayoutProperty(LAYERS.precinctHighlight, 'visibility', show.pinned.length > 0 ? 'visible' : 'none')
  map.setFilter(LAYERS.precinctHighlight, ['in', ['get', 'precinct'], ['literal', [...show.pinned]]])
}

/** Outlines what the pointer is over: a borough, or every precinct of an area. */
export function paintHover(map: Pick<PaintableMap, 'setFilter'>, target: Target | null, areas: readonly Area[]) {
  const borough = target?.kind === 'borough' ? target.borough : ''
  const precincts = target?.kind === 'precinct' ? [...areaOfPrecinct(areas, target.precinct).precincts] : []
  map.setFilter(LAYERS.boroughHover, ['==', ['get', 'borough'], borough])
  map.setFilter(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', precincts]])
}
