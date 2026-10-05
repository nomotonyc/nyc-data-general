import type { Map as MapLibreMap } from 'maplibre-gl'
import { BOROUGHS, GEOGRAPHIES, areasOf, type Geography } from '../domain/geography'
import type { Choropleth } from './choropleth'
import { FADE_DURATION, GEOGRAPHY_MAP, LAYERS, SOURCES, areaLayers, boroughLayers } from './config'
import type { Target } from './interaction'

export type PaintableMap = Pick<MapLibreMap, 'setFeatureState' | 'setLayoutProperty' | 'setPaintProperty' | 'setFilter'>

export type Show = {
  outlines: boolean
  labels: boolean
  /** The pinned area's number in the plan's geography, or none. */
  pinned: readonly number[]
}

/** The plan each map was last painted with, so a borough fill knows whether areas covered it. */
const lastPlans = new WeakMap<PaintableMap, Choropleth>()
const areasShown = (plan: Choropleth | undefined, b: string) => plan !== undefined && plan.level === 'area' && (plan.focus === null || plan.focus === b)

/**
 * Applies a colour plan, the focus, the pin and the Show-on-map toggles to the map.
 * With `fills: false` the caller sets the colours itself (BaseMap tweens them, see fillTween).
 */
export function paintMap(map: PaintableMap, plan: Choropleth, show: Show, options: { fills?: boolean } = {}) {
  const last = lastPlans.get(map)
  lastPlans.set(map, plan)
  if (options.fills !== false) paintFills(map, plan)
  // Opacity, not visibility: the layers fade (FADE_DURATION). A focused borough
  // stands alone while the rest of the city fades out; only the plan's geography shows.
  for (const b of BOROUGHS) {
    const layers = boroughLayers(b)
    const shown = plan.focus === null || plan.focus === b
    // Under shown areas the borough fill goes, so land no battalion covers (rivers the borough
    // outline counts as land) shows as water rather than the borough's colour. It only ever
    // changes while covered: it fades out once the areas are in, and snaps back under them
    // before they fade out. Boroughs that were hidden fade in as before.
    const covered = areasShown(plan, b)
    const transition = covered
      ? { duration: FADE_DURATION, delay: FADE_DURATION }
      : areasShown(last, b)
        ? { duration: 0, delay: 0 }
        : { duration: FADE_DURATION, delay: 0 }
    map.setPaintProperty(layers.boroughFill, 'fill-opacity-transition', transition)
    map.setPaintProperty(layers.boroughFill, 'fill-opacity', shown && !covered ? 1 : 0)
    map.setPaintProperty(layers.boroughLine, 'line-opacity', shown ? 1 : 0)
    for (const g of GEOGRAPHIES) {
      const current = g === plan.geography
      const areasColoured = current && shown && plan.level === 'area'
      // At area level the lines are what separate neighbouring colours.
      const outlines = current && shown && (plan.level === 'area' || show.outlines)
      const { fill, line } = areaLayers(b, g)
      map.setPaintProperty(fill, 'fill-opacity', areasColoured ? 1 : 0)
      map.setPaintProperty(line, 'line-opacity', outlines ? 0.8 : 0)
    }
  }

  map.setPaintProperty(LAYERS.boroughLabel, 'text-opacity', show.labels && plan.focus === null ? 1 : 0)
  for (const g of GEOGRAPHIES) {
    const { label, highlight, property } = GEOGRAPHY_MAP[g]
    const current = g === plan.geography
    map.setPaintProperty(label, 'text-opacity', current && show.labels && plan.focus !== null ? 1 : 0)
    // Only the focused borough's numbers are placed; at city level none are, since
    // invisible labels still take up room and would crowd out the borough names.
    map.setFilter(label, ['==', ['get', 'borough'], current ? (plan.focus ?? '') : ''])
    const pinned = current ? [...show.pinned] : []
    map.setLayoutProperty(highlight, 'visibility', pinned.length > 0 ? 'visible' : 'none')
    map.setFilter(highlight, ['in', ['get', property], ['literal', pinned]])
  }
}

/** Every borough's and current area's colour, set at once. */
export function paintFills(map: Pick<PaintableMap, 'setFeatureState'>, plan: Choropleth) {
  // Every borough and current area gets its fill (or none) each time, so nothing is left over from before.
  for (const b of BOROUGHS) map.setFeatureState({ source: SOURCES.boroughs, id: b }, { fill: plan.boroughs[b] ?? null })
  // Only the plan's geography: the other keeps its last colours while its layers fade out,
  // so switching precincts and battalions crossfades colour to colour, never through white.
  for (const a of areasOf(plan.geography)) {
    map.setFeatureState({ source: GEOGRAPHY_MAP[plan.geography].source, id: a.number }, { fill: plan.areas[a.number] ?? null })
  }
}

/** Outlines what the pointer is over: a borough, or an area of the current geography. */
export function paintHover(map: Pick<PaintableMap, 'setFilter'>, target: Target | null, geography: Geography) {
  map.setFilter(LAYERS.boroughHover, ['==', ['get', 'borough'], target?.kind === 'borough' ? target.borough : ''])
  for (const g of GEOGRAPHIES) {
    const area = target?.kind === 'area' && g === geography ? areasOf(g).find((a) => a.id === target.id) : undefined
    const numbers = area ? [area.number] : []
    map.setFilter(GEOGRAPHY_MAP[g].hover, ['in', ['get', GEOGRAPHY_MAP[g].property], ['literal', numbers]])
  }
}
