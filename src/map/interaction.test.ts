import { describe, expect, it } from 'vitest'
import { initialExplorerState } from '../explorer/state'
import { LAYERS, boroughLayers } from './config'
import { cardAction, clickAction, hitKind, hoverTarget, liveTarget, nearestFirst, placeAction, tapResult } from './interaction'

const borough = (name: string) => ({ kind: 'borough' as const, properties: { borough: name } })
const precinct = (n: number, b: string) => ({ kind: 'precincts' as const, properties: { precinct: n, borough: b } })
const battalion = (n: number, b: string) => ({ kind: 'battalions' as const, properties: { battalion: n, borough: b } })
// Precinct view, explicitly: the app opens on battalions.
const city = { ...initialExplorerState, geography: 'precincts' as const }
const battalions = { ...city, geography: 'battalions' as const }

describe('clickAction', () => {
  it('focuses the borough clicked at borough level', () => {
    expect(clickAction(city, [precinct(114, 'Queens'), borough('Queens')])).toEqual({ type: 'focusBorough', borough: 'Queens' })
  })

  it('pins the precinct clicked at area level', () => {
    expect(clickAction({ ...city, detail: 'area' }, [precinct(44, 'Bronx'), borough('Bronx')])).toEqual({ type: 'pinArea', id: '44' })
  })

  it('pins a precinct inside the focused borough', () => {
    expect(clickAction({ ...city, borough: 'Queens' }, [precinct(116, 'Queens'), borough('Queens')])).toEqual({ type: 'pinArea', id: '116' })
  })

  it('pins the battalion clicked when showing battalions', () => {
    expect(clickAction({ ...battalions, borough: 'Bronx' }, [battalion(14, 'Bronx'), borough('Bronx')])).toEqual({ type: 'pinArea', id: 'bn14' })
  })

  it('ignores the other geography’s shapes', () => {
    expect(clickAction({ ...battalions, borough: 'Bronx' }, [precinct(44, 'Bronx')])).toBeNull()
    expect(clickAction({ ...city, borough: 'Bronx' }, [battalion(14, 'Bronx')])).toBeNull()
  })

  it('ignores clicks on the hidden boroughs around a focused one', () => {
    expect(clickAction({ ...city, borough: 'Queens' }, [precinct(75, 'Brooklyn'), borough('Brooklyn')])).toBeNull()
  })

  it('ignores clicks on the water when nothing is pinned', () => {
    expect(clickAction(city, [])).toBeNull()
  })

  it('unpins when the water is clicked, staying in the current view', () => {
    expect(clickAction({ ...city, borough: 'Brooklyn', pinnedArea: '75' }, [])).toEqual({ type: 'unpinArea' })
  })

  it('unpins when the faded area around a focused borough is clicked', () => {
    expect(clickAction({ ...city, borough: 'Queens', pinnedArea: '114' }, [precinct(75, 'Brooklyn')])).toEqual({ type: 'unpinArea' })
  })

  it('ignores features that are not a known borough or area', () => {
    expect(clickAction(city, [borough('Atlantis')])).toBeNull()
    expect(clickAction({ ...city, detail: 'area' }, [precinct(2, 'Manhattan')])).toBeNull()
    expect(clickAction({ ...battalions, detail: 'area' }, [battalion(5, 'Manhattan')])).toBeNull()
  })
})

describe('tapResult', () => {
  it('selects the borough tapped, instead of focusing it straight away', () => {
    expect(tapResult(city, [borough('Queens')])).toEqual({ select: { kind: 'borough', borough: 'Queens' }, action: null })
  })

  it('selects the area tapped, instead of pinning it straight away', () => {
    expect(tapResult({ ...city, borough: 'Bronx' }, [precinct(44, 'Bronx'), borough('Bronx')])).toEqual({ select: { kind: 'area', id: '44' }, action: null })
  })

  it('selects a firehouse, which a click passes through', () => {
    const firehouse = { kind: 'firehouse' as const, properties: { id: 7, name: 'Engine 1', address: '142 West 31st Street', neighbourhood: 'Midtown', borough: 'Manhattan' } }
    expect(tapResult({ ...city, showFirehouses: true }, [firehouse, borough('Manhattan')]).select).toMatchObject({ kind: 'firehouse', id: 7 })
  })

  it('acts on a place tapped again while selected, as a click does: a double tap', () => {
    const queens = { kind: 'borough' as const, borough: 'Queens' as const }
    expect(tapResult(city, [borough('Queens')], queens)).toEqual({ select: null, action: { type: 'focusBorough', borough: 'Queens' } })
  })

  it('keeps an area selected once a double tap pins it, since the view stays put', () => {
    const p44 = { kind: 'area' as const, id: '44' }
    expect(tapResult({ ...city, borough: 'Bronx' }, [precinct(44, 'Bronx')], p44)).toEqual({ select: p44, action: { type: 'pinArea', id: '44' } })
  })

  it('selects the area a double tap on a firehouse pins, so its card follows the pin', () => {
    const firehouse = { kind: 'firehouse' as const, properties: { id: 7, name: 'Engine 1', address: '142 West 31st Street', neighbourhood: 'Midtown', borough: 'Manhattan' } }
    const inManhattan = { ...city, borough: 'Manhattan' as const, showFirehouses: true }
    const hits = [firehouse, precinct(14, 'Manhattan')]
    const selected = tapResult(inManhattan, hits).select
    expect(tapResult(inManhattan, hits, selected)).toEqual({ select: { kind: 'area', id: '14' }, action: { type: 'pinArea', id: '14' } })
  })

  it('selects another place tapped while one is selected', () => {
    expect(tapResult(city, [borough('Bronx')], { kind: 'borough', borough: 'Queens' }).select).toEqual({ kind: 'borough', borough: 'Bronx' })
  })

  it('acts on the place beneath a firehouse tapped again, since a firehouse has no action of its own', () => {
    const firehouse = { kind: 'firehouse' as const, properties: { id: 7, name: 'Engine 1', address: '142 West 31st Street', neighbourhood: 'Midtown', borough: 'Manhattan' } }
    const shown = { ...city, showFirehouses: true }
    const selected = tapResult(shown, [firehouse, borough('Manhattan')]).select
    expect(tapResult(shown, [firehouse, borough('Manhattan')], selected)).toEqual({ select: null, action: { type: 'focusBorough', borough: 'Manhattan' } })
  })

  it('drops the pin on a tap on nothing, as a click does', () => {
    expect(tapResult({ ...city, borough: 'Brooklyn', pinnedArea: '75' }, [])).toEqual({ select: null, action: { type: 'unpinArea' } })
    expect(tapResult(city, [])).toEqual({ select: null, action: null })
  })
})

describe('cardAction', () => {
  it('focuses a borough, pins an area, and unpins the area once it is pinned', () => {
    expect(cardAction({ kind: 'borough', borough: 'Bronx' }, null)).toEqual({ type: 'focusBorough', borough: 'Bronx' })
    expect(cardAction({ kind: 'area', id: '44' }, null)).toEqual({ type: 'pinArea', id: '44' })
    expect(cardAction({ kind: 'area', id: '44' }, '75')).toEqual({ type: 'pinArea', id: '44' })
    expect(cardAction({ kind: 'area', id: '44' }, '44')).toEqual({ type: 'unpinArea' })
  })
})

describe('placeAction', () => {
  it('focuses a borough and pins an area', () => {
    expect(placeAction({ kind: 'borough', borough: 'Bronx' })).toEqual({ type: 'focusBorough', borough: 'Bronx' })
    expect(placeAction({ kind: 'area', id: 'bn14' })).toEqual({ type: 'pinArea', id: 'bn14' })
  })
})

describe('hoverTarget', () => {
  it('names the battalion under the pointer by its id', () => {
    expect(hoverTarget({ ...battalions, detail: 'area' }, [battalion(3, 'Bronx')])).toEqual({ kind: 'area', id: 'bn3' })
  })
})

describe('hitKind', () => {
  it('tells borough layers from precinct and battalion layers', () => {
    expect(hitKind(boroughLayers('Queens').boroughFill)).toBe('borough')
    expect(hitKind(boroughLayers('Queens').precinctFill)).toBe('precincts')
    expect(hitKind(boroughLayers('Queens').battalionFill)).toBe('battalions')
    expect(hitKind(LAYERS.boroughLabel)).toBeNull()
  })
})

describe('liveTarget', () => {
  it('drops a hover left over from the other geography, so switching never looks up a missing area', () => {
    expect(liveTarget({ kind: 'area', id: '44' }, 'battalions')).toBeNull()
    expect(liveTarget({ kind: 'area', id: 'bn14' }, 'precincts')).toBeNull()
    expect(liveTarget({ kind: 'area', id: 'bn14' }, 'battalions')).toEqual({ kind: 'area', id: 'bn14' })
    expect(liveTarget({ kind: 'borough', borough: 'Bronx' }, 'battalions')).toEqual({ kind: 'borough', borough: 'Bronx' })
    expect(liveTarget(null, 'precincts')).toBeNull()
  })
})

describe('firehouses under the pointer', () => {
  const props = { id: 7, name: 'Engine 1/Ladder 24', address: '142 West 31st Street', neighbourhood: 'Midtown', borough: 'Manhattan', battalion: 7 }
  const firehouse = { kind: 'firehouse' as const, properties: props }
  const shown = { ...city, showFirehouses: true }

  it('are what the pointer is over when shown, ahead of the borough or area beneath', () => {
    expect(hoverTarget(shown, [firehouse, borough('Manhattan')])).toEqual({ kind: 'firehouse', id: 7, firehouse: { ...props, command: null, note: null } })
    expect(hoverTarget({ ...shown, detail: 'area' }, [firehouse, precinct(14, 'Manhattan')])).toMatchObject({ kind: 'firehouse', id: 7 })
  })

  it('are nothing while hidden, or outside the focused borough', () => {
    expect(hoverTarget(city, [firehouse, borough('Manhattan')])).toEqual({ kind: 'borough', borough: 'Manhattan' })
    expect(hoverTarget({ ...shown, borough: 'Queens' }, [firehouse])).toBeNull()
  })

  it('let clicks through to what is beneath', () => {
    expect(clickAction(shown, [firehouse, borough('Manhattan')])).toEqual({ type: 'focusBorough', borough: 'Manhattan' })
  })

  it('are told apart from other layers by id', () => {
    expect(hitKind(boroughLayers('Queens').firehouse)).toBe('firehouse')
  })
})

describe('nearestFirst', () => {
  it('orders marker hits by how near they are to the pointer, not by drawing order', () => {
    const at = (x: number) => ({ geometry: { type: 'Point', coordinates: [x, 0] } })
    const project = ([x]: number[]) => ({ x: x * 10, y: 0 })
    expect(nearestFirst([at(3), at(1), at(2)], { x: 12, y: 0 }, project)).toEqual([at(1), at(2), at(3)])
  })
})

describe('a firehouse whose properties the map dropped', () => {
  it('reads a missing battalion or command as none, as the map leaves out null values', () => {
    const target = hoverTarget({ ...city, showFirehouses: true }, [{ kind: 'firehouse', properties: { id: 4, name: 'Marine 1', address: 'Pier', neighbourhood: '', borough: 'Manhattan' } }])
    expect(target).toMatchObject({ kind: 'firehouse', firehouse: { battalion: null, command: null } })
  })
})
