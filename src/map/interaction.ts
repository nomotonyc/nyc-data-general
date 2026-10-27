import { BOROUGHS, areaIdOf, areasOf, type Borough, type Geography } from '../domain/geography'
import type { Firehouse } from '../domain/firehouses'
import { effectiveDetail, type ExplorerAction, type ExplorerState } from '../explorer/state'

/** A feature under the pointer: which kind of layer it came from, and its properties. */
export type Hit = { kind: 'borough' | Geography | 'firehouse' | 'hospital' | 'emsStation'; properties: Record<string, unknown> }

/** Which kind of shape a layer draws, by its id (see boroughLayers). */
export function hitKind(layerId: string): Hit['kind'] | null {
  if (layerId.startsWith('borough-fill-')) return 'borough'
  if (layerId.startsWith('precinct-fill-')) return 'precincts'
  if (layerId.startsWith('battalion-fill-')) return 'battalions'
  if (layerId.startsWith('division-fill-')) return 'divisions'
  if (layerId.startsWith('firehouse-') && layerId !== 'firehouse-hover') return 'firehouse'
  if (layerId.startsWith('hospital-')) return 'hospital'
  if (layerId.startsWith('ems-station-')) return 'emsStation'
  return null
}

/** What the pointer is over: a borough, an area by id, or a firehouse (hover only; clicks go to what's under it). */
export type Target = PlaceTarget | { kind: 'firehouse'; id: number; firehouse: Firehouse }
  | { kind: 'hospital'; id: string; name: string; address: string; borough: string }
  | { kind: 'emsStation'; id: string; name: string; address: string; borough: string }
/** A borough or an area: what a click acts on and the place hover card describes. */
export type PlaceTarget = { kind: 'borough'; borough: Borough } | { kind: 'area'; id: string }

const NUMBER_PROPERTY: Record<Geography, string> = { divisions: 'division', precincts: 'precinct', battalions: 'battalion' }

/**
 * A shown firehouse, in view (the whole city, or the focused borough), comes first. Otherwise,
 * at borough level the pointer is over a borough; at area level, over an area of the current
 * geography. The hidden boroughs around a focused one, the other geography's shapes, and
 * anything unknown, are nothing.
 */
export function hoverTarget(
  state: Pick<ExplorerState, 'borough' | 'detail' | 'geography'> & Partial<Pick<ExplorerState, 'showFirehouses' | 'showHospitals' | 'showEmsStations'>>,
  hits: readonly Hit[],
): Target | null {
  if (state.showHospitals) {
    const hit = hits.find((h) => h.kind === 'hospital' && (!state.borough || h.properties.borough === state.borough))
    if (hit) return { kind: 'hospital', id: String(hit.properties.id), name: String(hit.properties.name), address: String(hit.properties.address), borough: String(hit.properties.borough) }
  }
  if (state.showEmsStations) {
    const hit = hits.find((h) => h.kind === 'emsStation' && (!state.borough || h.properties.borough === state.borough))
    if (hit) return { kind: 'emsStation', id: String(hit.properties.id), name: String(hit.properties.name), address: String(hit.properties.address), borough: String(hit.properties.borough) }
  }
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
  return placeAction(target)
}

/** What acting on a place does: focus a borough, or pin an area. */
export function placeAction(target: PlaceTarget): ExplorerAction {
  return target.kind === 'borough' ? { type: 'focusBorough', borough: target.borough } : { type: 'pinArea', id: target.id }
}

/** What a tapped card's button does: as a click, except that a pinned area's button unpins it. */
export function cardAction(target: PlaceTarget, pinnedArea: string | null): ExplorerAction {
  return target.kind === 'area' && target.id === pinnedArea ? { type: 'unpinArea' } : placeAction(target)
}

/**
 * Touch has no hover, so a tap selects what a pointer would be over (a firehouse included),
 * whose card then offers the click's action as a button. Tapping the selected place again (a
 * double tap) does what a click does: through a firehouse, to the place beneath. A pin selects
 * the area pinned, its card open; focusing a borough goes into it, and closes the card. A tap on
 * nothing does what a click does too. `select` is what's selected after the tap.
 */
export function tapResult(
  state: Pick<ExplorerState, 'borough' | 'detail' | 'geography' | 'pinnedArea'> & Partial<Pick<ExplorerState, 'showFirehouses' | 'showHospitals' | 'showEmsStations'>>,
  hits: readonly Hit[],
  selected: Target | null = null,
): { select: Target | null; action: ExplorerAction | null } {
  const target = hoverTarget(state, hits)
  if (target && !sameTarget(target, selected)) return { select: target, action: null }
  const action = clickAction(state, hits)
  return { select: target && action?.type === 'pinArea' ? { kind: 'area', id: action.id } : null, action }
}

/** Whether two targets name the same place or firehouse. */
export function sameTarget(a: Target | null, b: Target | null): boolean {
  if (a === null || b === null) return a === b
  if (a.kind === 'borough') return b.kind === 'borough' && a.borough === b.borough
  if (a.kind === 'area') return b.kind === 'area' && a.id === b.id
  return b.kind === a.kind && a.id === b.id
}

function isBorough(value: unknown): value is Borough {
  return (BOROUGHS as readonly unknown[]).includes(value)
}

/**
 * The target if it still exists in the current geography. A hover can outlive a switch
 * between precincts and battalions (when the pointer doesn't move, e.g. switching by keyboard),
 * and its id then names an area the new geography doesn't have.
 */
export function liveTarget(target: Target | null, geography: Geography, firehouses = false, hospitals = false, emsStations = false): Target | null {
  if (target?.kind === 'firehouse') return firehouses ? target : null
  if (target?.kind === 'hospital') return hospitals ? target : null
  if (target?.kind === 'emsStation') return emsStations ? target : null
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
