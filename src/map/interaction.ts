import { BOROUGHS, areaIdOf, areasOf, type Borough, type Geography } from '../domain/geography'
import { effectiveDetail, type ExplorerAction, type ExplorerState } from '../explorer/state'

/** A feature under the pointer: which kind of layer it came from, and its properties. */
export type Hit = { kind: 'borough' | Geography; properties: Record<string, unknown> }

/** Which kind of shape a layer draws, by its id (see boroughLayers). */
export function hitKind(layerId: string): Hit['kind'] | null {
  if (layerId.startsWith('borough-fill-')) return 'borough'
  if (layerId.startsWith('precinct-fill-')) return 'precincts'
  if (layerId.startsWith('battalion-fill-')) return 'battalions'
  return null
}

/** What the pointer is over, for clicking and hovering alike: a borough, or an area by id. */
export type Target = { kind: 'borough'; borough: Borough } | { kind: 'area'; id: string }

const NUMBER_PROPERTY: Record<Geography, string> = { precincts: 'precinct', battalions: 'battalion' }

/**
 * At borough level the pointer is over a borough; at area level, over an area
 * of the current geography. The hidden boroughs around a focused one, the other
 * geography's shapes, and anything unknown, are nothing.
 */
export function hoverTarget(state: Pick<ExplorerState, 'borough' | 'detail' | 'geography'>, hits: readonly Hit[]): Target | null {
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
  const target = hoverTarget(state, hits)
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
export function liveTarget(target: Target | null, geography: Geography): Target | null {
  if (target?.kind !== 'area') return target
  return areasOf(geography).some((a) => a.id === target.id) ? target : null
}
