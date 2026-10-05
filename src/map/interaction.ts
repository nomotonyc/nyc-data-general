import { BOROUGHS, areaIdOf, areasOf, type Borough, type Geography } from '../domain/geography'
import type { Firehouse } from '../domain/firehouses'
import { effectiveDetail, type ExplorerAction, type ExplorerState } from '../explorer/state'

/** A feature under the pointer: which kind of layer it came from, and its properties. */
export type Hit = { kind: 'borough' | Geography | 'firehouse'; properties: Record<string, unknown> }

/** Which kind of shape a layer draws, by its id (see boroughLayers). */
export function hitKind(layerId: string): Hit['kind'] | null {
  if (layerId.startsWith('borough-fill-')) return 'borough'
  if (layerId.startsWith('precinct-fill-')) return 'precincts'
  if (layerId.startsWith('battalion-fill-')) return 'battalions'
  if (layerId.startsWith('firehouse-') && layerId !== 'firehouse-hover') return 'firehouse'
  return null
}

/** What the pointer is over: a borough, an area by id, or a firehouse (hover only; clicks go to what's under it). */
export type Target = PlaceTarget | { kind: 'firehouse'; id: number; firehouse: Firehouse }
/** A borough or an area: what a click acts on and the place hover card describes. */
export type PlaceTarget = { kind: 'borough'; borough: Borough } | { kind: 'area'; id: string }

const NUMBER_PROPERTY: Record<Geography, string> = { precincts: 'precinct', battalions: 'battalion' }

/**
 * A shown firehouse, in view (the whole city, or the focused borough), comes first. Otherwise,
 * at borough level the pointer is over a borough; at area level, over an area of the current
 * geography. The hidden boroughs around a focused one, the other geography's shapes, and
 * anything unknown, are nothing.
 */
export function hoverTarget(
  state: Pick<ExplorerState, 'borough' | 'detail' | 'geography'> & Partial<Pick<ExplorerState, 'showFirehouses'>>,
  hits: readonly Hit[],
): Target | null {
  if (state.showFirehouses) {
    const hit = hits.find((h) => h.kind === 'firehouse' && (!state.borough || h.properties.borough === state.borough))
    if (hit) {
      // The map leaves null values out of feature properties, so a missing one means none.
      const p = hit.properties as Partial<Firehouse> & Pick<Firehouse, 'id' | 'name' | 'address' | 'neighbourhood' | 'borough'>
      const firehouse: Firehouse = { ...p, battalion: p.battalion ?? null, command: p.command ?? null, note: p.note ?? null }
      return { kind: 'firehouse', id: firehouse.id, firehouse }
    }
  }
  return placeTarget(state, hits)
}

/** The borough or area under the pointer, whatever is drawn over it. */
function placeTarget(state: Pick<ExplorerState, 'borough' | 'detail' | 'geography'>, hits: readonly Hit[]): PlaceTarget | null {
  if (effectiveDetail(state) === 'borough') {
    const borough = hits.find((h) => h.kind === 'borough')?.properties.borough
    return isBorough(borough) ? { kind: 'borough', borough } : null
  }
  const hit = hits.find((h) => h.kind === state.geography)
  if (!hit) return null
  const id = areaIdOf(state.geography, Number(hit.properties[NUMBER_PROPERTY[state.geography]]))
  const area = areasOf(state.geography).find((a) => a.id === id)
  if (!area || (state.borough && area.borough !== state.borough)) return null
  return { kind: 'area', id }
}

/**
 * A click focuses the borough under the pointer, or pins the area. A click on
 * nothing (the water, or the faded city around a focused borough) drops the pin
 * and leaves the view where it is.
 */
export function clickAction(
  state: Pick<ExplorerState, 'borough' | 'detail' | 'geography' | 'pinnedArea'>,
  hits: readonly Hit[],
): ExplorerAction | null {
  // Firehouses are only hovered: a click goes to the place beneath.
  const target = placeTarget(state, hits)
  if (!target) return state.pinnedArea === null ? null : { type: 'unpinArea' }
  return target.kind === 'borough' ? { type: 'focusBorough', borough: target.borough } : { type: 'pinArea', id: target.id }
}

function isBorough(value: unknown): value is Borough {
  return (BOROUGHS as readonly unknown[]).includes(value)
}

/**
 * The target if it still exists in the current geography. A hover can outlive a switch
 * between precincts and battalions (when the pointer doesn't move, e.g. switching by keyboard),
 * and its id then names an area the new geography doesn't have.
 */
export function liveTarget(target: Target | null, geography: Geography, firehouses = false): Target | null {
  if (target?.kind === 'firehouse') return firehouses ? target : null
  if (target?.kind !== 'area') return target
  return areasOf(geography).some((a) => a.id === target.id) ? target : null
}

/**
 * Point features ordered nearest the pointer first. The map returns what is under a box in
 * drawing order, so in a dense spot the marker drawn on top could win over the one beneath
 * the pointer.
 */
export function nearestFirst<F extends { geometry: { type: string; coordinates?: unknown } }>(
  features: readonly F[],
  pointer: { x: number; y: number },
  project: (lngLat: [number, number]) => { x: number; y: number },
): F[] {
  const distance = (f: F) => {
    if (f.geometry.type !== 'Point') return Infinity
    const { x, y } = project(f.geometry.coordinates as [number, number])
    return Math.hypot(x - pointer.x, y - pointer.y)
  }
  return [...features].sort((a, b) => distance(a) - distance(b))
}
