import { BOROUGHS, boroughOfPrecinct, isPrecinct, type Borough } from '../domain/geography'
import { effectiveDetail, type ExplorerAction, type ExplorerState } from '../explorer/state'

/** A feature under the pointer: which kind of layer it came from, and its properties. */
export type Hit = { kind: 'borough' | 'precinct'; properties: Record<string, unknown> }

/** Which kind of shape a layer draws, by its id (see boroughLayers). */
export function hitKind(layerId: string): Hit['kind'] | null {
  if (layerId.startsWith('borough-fill-')) return 'borough'
  if (layerId.startsWith('precinct-fill-')) return 'precinct'
  return null
}

/** What the pointer is over, for clicking and hovering alike. */
export type Target = { kind: 'borough'; borough: Borough } | { kind: 'precinct'; precinct: number }

/**
 * At borough level the pointer is over a borough; at precinct level, over a
 * precinct. The hidden boroughs around a focused one, and anything unknown,
 * are nothing.
 */
export function hoverTarget(state: Pick<ExplorerState, 'borough' | 'detail'>, hits: readonly Hit[]): Target | null {
  if (effectiveDetail(state) === 'borough') {
    const borough = hits.find((h) => h.kind === 'borough')?.properties.borough
    return isBorough(borough) ? { kind: 'borough', borough } : null
  }
  const precinct = Number(hits.find((h) => h.kind === 'precinct')?.properties.precinct)
  if (!isPrecinct(precinct)) return null
  if (state.borough && boroughOfPrecinct(precinct) !== state.borough) return null
  return { kind: 'precinct', precinct }
}

/**
 * A click focuses the borough under the pointer, or pins the precinct. A click
 * on nothing (the water, or the faded city around a focused borough) drops the
 * pin and leaves the view where it is.
 */
export function clickAction(
  state: Pick<ExplorerState, 'borough' | 'detail' | 'pinnedPrecinct'>,
  hits: readonly Hit[],
): ExplorerAction | null {
  const target = hoverTarget(state, hits)
  if (!target) return state.pinnedPrecinct === null ? null : { type: 'unpinPrecinct' }
  return target.kind === 'borough'
    ? { type: 'focusBorough', borough: target.borough }
    : { type: 'pinPrecinct', precinct: target.precinct }
}

function isBorough(value: unknown): value is Borough {
  return (BOROUGHS as readonly unknown[]).includes(value)
}
