import { describe, expect, it, vi } from 'vitest'
import { BOROUGHS } from '../domain/geography'
import type { Choropleth } from './choropleth'
import { FADE_DURATION, LAYERS, SOURCES, boroughLayers } from './config'
import { paintHover, paintMap } from './paint'

const fakeMap = () => ({ setFeatureState: vi.fn(), setLayoutProperty: vi.fn(), setPaintProperty: vi.fn(), setFilter: vi.fn() })
const base: Choropleth = { level: 'borough', focus: null, boroughs: {}, geography: 'precincts', areas: {}, lo: 0, hi: 1, range: { from: 2025, to: 2025 }, adjusted: false }
const areaLevel: Choropleth = { ...base, level: 'area' }
const queens: Choropleth = { ...base, level: 'area', focus: 'Queens' }
const bronxBattalions: Choropleth = { ...base, level: 'area', focus: 'Bronx', geography: 'battalions' }
const show = { outlines: true, labels: true, firehouses: false, pinned: [] as number[] }

type FakeMap = ReturnType<typeof fakeMap>
/** The last opacity set on a layer, or undefined if none. */
const opacity = (map: FakeMap, layer: string) =>
  map.setPaintProperty.mock.calls.filter(([id]) => id === layer).at(-1)?.[2]
const paint = (plan: Choropleth, s = show) => {
  const map = fakeMap()
  paintMap(map, plan, s)
  return map
}

describe('paintMap', () => {
  it('gives every borough and area of the plan’s geography its fill, clearing the ones without', () => {
    const map = paint({ ...base, boroughs: { Queens: '#111111' }, areas: { 116: '#222222' } })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs, id: 'Queens' }, { fill: '#111111' })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs, id: 'Manhattan' }, { fill: null })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.precincts, id: 116 }, { fill: '#222222' })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.precincts, id: 1 }, { fill: null })
    expect(map.setFeatureState).toHaveBeenCalledTimes(5 + 78)
  })

  it('leaves colours to the caller when asked, for colour changes drawn frame by frame', () => {
    const map = fakeMap()
    paintMap(map, { ...base, boroughs: { Queens: '#111111' } }, show, { fills: false })
    expect(map.setFeatureState).not.toHaveBeenCalled()
  })

  it('leaves the other geography’s colours alone, so switching crossfades colour to colour instead of flashing white', () => {
    const map = paint(bronxBattalions)
    const touched = map.setFeatureState.mock.calls.map(([target]) => (target as { source: string }).source)
    expect(touched).not.toContain(SOURCES.precincts)
    expect(touched).toContain(SOURCES.battalions)
  })

  it('shows every borough and no area fills at borough level', () => {
    const map = paint(base)
    for (const b of BOROUGHS) {
      expect(opacity(map, boroughLayers(b).boroughFill), b).toBe(1)
      expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(0)
      expect(opacity(map, boroughLayers(b).battalionFill), b).toBe(0)
    }
  })

  it('fades in every precinct at city area level', () => {
    const map = paint(areaLevel)
    for (const b of BOROUGHS) expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(1)
  })

  it('shows battalions, not precincts, when the plan is in battalions', () => {
    const map = paint(bronxBattalions)
    expect(opacity(map, boroughLayers('Bronx').battalionFill)).toBe(1)
    expect(opacity(map, boroughLayers('Bronx').battalionLine)).toBe(0.8)
    expect(opacity(map, boroughLayers('Bronx').precinctFill)).toBe(0)
    expect(opacity(map, boroughLayers('Bronx').precinctLine)).toBe(0)
    expect(opacity(map, LAYERS.battalionLabel)).toBe(1)
    expect(opacity(map, LAYERS.precinctLabel)).toBe(0)
  })

  it('fades out every borough but the focused one', () => {
    const map = paint(queens)
    expect(opacity(map, boroughLayers('Queens').boroughLine)).toBe(1)
    expect(opacity(map, boroughLayers('Queens').precinctFill)).toBe(1)
    for (const b of BOROUGHS.filter((x) => x !== 'Queens')) {
      expect(opacity(map, boroughLayers(b).boroughFill), b).toBe(0)
      expect(opacity(map, boroughLayers(b).boroughLine), b).toBe(0)
      expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(0)
      expect(opacity(map, boroughLayers(b).precinctLine), b).toBe(0)
    }
  })

  it('shows area outlines only when asked at borough level', () => {
    expect(opacity(paint(base), boroughLayers('Bronx').precinctLine)).toBe(0.8)
    expect(opacity(paint(base, { ...show, outlines: false }), boroughLayers('Bronx').precinctLine)).toBe(0)
    expect(opacity(paint(base), boroughLayers('Bronx').battalionLine)).toBe(0)
  })

  it('always shows area lines at area level, where they separate the colours', () => {
    expect(opacity(paint(areaLevel, { ...show, outlines: false }), boroughLayers('Bronx').precinctLine)).toBe(0.8)
  })

  it('fades borough names out and the focused borough’s numbers in', () => {
    const map = paint(queens)
    expect(opacity(map, LAYERS.boroughLabel)).toBe(0)
    expect(opacity(map, LAYERS.precinctLabel)).toBe(1)
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctLabel, ['==', ['get', 'borough'], 'Queens'])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.battalionLabel, ['==', ['get', 'borough'], ''])
  })

  it('shows borough names at city level', () => {
    const map = paint(base)
    expect(opacity(map, LAYERS.boroughLabel)).toBe(1)
    expect(opacity(map, LAYERS.precinctLabel)).toBe(0)
  })

  it('places no area numbers at city level, where invisible ones would crowd out borough names', () => {
    expect(paint(base).setFilter).toHaveBeenCalledWith(LAYERS.precinctLabel, ['==', ['get', 'borough'], ''])
  })

  it('hides every name when Place labels is off', () => {
    expect(opacity(paint(base, { ...show, labels: false }), LAYERS.boroughLabel)).toBe(0)
    expect(opacity(paint(queens, { ...show, labels: false }), LAYERS.precinctLabel)).toBe(0)
  })

  it('outlines the pinned area in its own geography', () => {
    const map = paint(bronxBattalions, { ...show, pinned: [14] })
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.battalionHighlight, ['in', ['get', 'battalion'], ['literal', [14]]])
    expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYERS.battalionHighlight, 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYERS.precinctHighlight, 'visibility', 'none')
  })

  it('shows no highlight without a pin', () => {
    expect(paint(queens).setLayoutProperty).toHaveBeenCalledWith(LAYERS.precinctHighlight, 'visibility', 'none')
  })
})

describe('paintHover', () => {
  it('outlines the borough under the pointer', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'borough', borough: 'Queens' }, 'precincts')
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], 'Queens'])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })

  it('outlines the precinct or battalion under the pointer', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'area', id: '116' }, 'precincts')
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', [116]]])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], ''])
    const bmap = fakeMap()
    paintHover(bmap, { kind: 'area', id: 'bn14' }, 'battalions')
    expect(bmap.setFilter).toHaveBeenCalledWith(LAYERS.battalionHover, ['in', ['get', 'battalion'], ['literal', [14]]])
    expect(bmap.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })

  it('outlines nothing, rather than failing, for an area of the other geography', () => {
    const map = fakeMap()
    expect(() => paintHover(map, { kind: 'area', id: '44' }, 'battalions')).not.toThrow()
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.battalionHover, ['in', ['get', 'battalion'], ['literal', []]])
  })

  it('outlines nothing when the pointer leaves', () => {
    const map = fakeMap()
    paintHover(map, null, 'precincts')
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], ''])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })
})

describe('the borough fill under shown areas', () => {
  /** The last transition set on a layer's fill opacity. */
  const transition = (map: FakeMap, layer: string) =>
    map.setPaintProperty.mock.calls.filter(([id, prop]) => id === layer && prop === 'fill-opacity-transition').at(-1)?.[2]

  it('fades out once the areas over it are in, so gaps between battalions show as water, not the borough colour', () => {
    const map = paint(queens)
    expect(opacity(map, boroughLayers('Queens').boroughFill)).toBe(0)
    expect(transition(map, boroughLayers('Queens').boroughFill)).toEqual({ duration: FADE_DURATION, delay: FADE_DURATION })
  })

  it('snaps back under the areas when leaving area level, so they fade out over it, never through to the water', () => {
    const map = fakeMap()
    paintMap(map, queens, show)
    paintMap(map, base, show)
    expect(opacity(map, boroughLayers('Queens').boroughFill)).toBe(1)
    expect(transition(map, boroughLayers('Queens').boroughFill)).toEqual({ duration: 0, delay: 0 })
  })

  it('fades in as before for boroughs that were hidden', () => {
    const map = fakeMap()
    paintMap(map, queens, show)
    paintMap(map, base, show)
    expect(opacity(map, boroughLayers('Bronx').boroughFill)).toBe(1)
    expect(transition(map, boroughLayers('Bronx').boroughFill)).toEqual({ duration: FADE_DURATION, delay: 0 })
  })
})

describe('firehouses', () => {
  const marker = (map: FakeMap, layer: string) =>
    map.setPaintProperty.mock.calls.filter(([id, prop]) => id === layer && prop === 'circle-opacity').at(-1)?.[2]
  const ring = (map: FakeMap, layer: string) =>
    map.setPaintProperty.mock.calls.filter(([id, prop]) => id === layer && prop === 'circle-stroke-opacity').at(-1)?.[2]

  it('stay hidden until asked for', () => {
    const map = paint(base)
    for (const b of BOROUGHS) expect(marker(map, boroughLayers(b).firehouse), b).toBe(0)
  })

  it('show across the city when asked for, at any level and in either geography', () => {
    for (const plan of [base, areaLevel, { ...areaLevel, geography: 'battalions' as const }]) {
      const map = paint(plan, { ...show, firehouses: true })
      for (const b of BOROUGHS) {
        expect(marker(map, boroughLayers(b).firehouse), b).toBe(1)
        expect(ring(map, boroughLayers(b).firehouse), b).toBe(1)
      }
    }
  })

  it('bring the borough commands’ outer rings with them, and only their rings, never a fill', () => {
    const on = paint(base, { ...show, firehouses: true })
    const off = paint(base)
    expect(ring(on, boroughLayers('Queens').firehouseRing)).toBe(1)
    expect(ring(off, boroughLayers('Queens').firehouseRing)).toBe(0)
    expect(marker(on, boroughLayers('Queens').firehouseRing)).toBeUndefined()
  })

  it('show only in a focused borough, fading with the rest of the city', () => {
    const map = paint(queens, { ...show, firehouses: true })
    expect(marker(map, boroughLayers('Queens').firehouse)).toBe(1)
    expect(marker(map, boroughLayers('Bronx').firehouse)).toBe(0)
    expect(ring(map, boroughLayers('Bronx').firehouse)).toBe(0)
  })

  it('outline the firehouse under the pointer, and no area with it', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'firehouse', id: 12, firehouse: { id: 12, name: 'Engine 1', address: '', neighbourhood: '', borough: 'Queens', battalion: 50, command: null, note: null } }, 'precincts')
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.firehouseHover, ['in', ['get', 'id'], ['literal', [12]]])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], ''])
  })

  it('outline none when the pointer is over an area', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'area', id: '44' }, 'precincts')
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.firehouseHover, ['in', ['get', 'id'], ['literal', []]])
  })
})
