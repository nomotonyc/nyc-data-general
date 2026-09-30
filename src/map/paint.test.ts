import { describe, expect, it, vi } from 'vitest'
import { BOROUGHS } from '../domain/geography'
import type { Choropleth } from './choropleth'
import { LAYERS, SOURCES, boroughLayers } from './config'
import { paintHover, paintMap } from './paint'

const fakeMap = () => ({ setFeatureState: vi.fn(), setLayoutProperty: vi.fn(), setPaintProperty: vi.fn(), setFilter: vi.fn() })
const base: Choropleth = { level: 'borough', focus: null, boroughs: {}, precincts: {}, lo: 0, hi: 1, range: { from: 2025, to: 2025 }, adjusted: false }
const precinctLevel: Choropleth = { ...base, level: 'precinct' }
const queens: Choropleth = { ...base, level: 'precinct', focus: 'Queens' }
const show = { outlines: true, labels: true, pinned: [] as number[] }

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
  it('gives every borough and precinct its fill, clearing the ones without', () => {
    const map = paint({ ...base, boroughs: { Queens: '#111111' }, precincts: { 116: '#222222' } })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs, id: 'Queens' }, { fill: '#111111' })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs, id: 'Manhattan' }, { fill: null })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.precincts, id: 116 }, { fill: '#222222' })
    expect(map.setFeatureState).toHaveBeenCalledTimes(5 + 78)
  })

  it('shows every borough and no precinct fills at borough level', () => {
    const map = paint(base)
    for (const b of BOROUGHS) {
      expect(opacity(map, boroughLayers(b).boroughFill), b).toBe(1)
      expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(0)
    }
  })

  it('fades in every precinct at city precinct level', () => {
    const map = paint(precinctLevel)
    for (const b of BOROUGHS) expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(1)
  })

  it('fades out every borough but the focused one', () => {
    const map = paint(queens)
    expect(opacity(map, boroughLayers('Queens').boroughFill)).toBe(1)
    expect(opacity(map, boroughLayers('Queens').precinctFill)).toBe(1)
    for (const b of BOROUGHS.filter((x) => x !== 'Queens')) {
      expect(opacity(map, boroughLayers(b).boroughFill), b).toBe(0)
      expect(opacity(map, boroughLayers(b).boroughLine), b).toBe(0)
      expect(opacity(map, boroughLayers(b).precinctFill), b).toBe(0)
      expect(opacity(map, boroughLayers(b).precinctLine), b).toBe(0)
    }
  })

  it('shows precinct outlines only when asked at borough level', () => {
    expect(opacity(paint(base), boroughLayers('Bronx').precinctLine)).toBe(0.8)
    expect(opacity(paint(base, { ...show, outlines: false }), boroughLayers('Bronx').precinctLine)).toBe(0)
  })

  it('always shows precinct lines at precinct level, where they separate the colours', () => {
    expect(opacity(paint(precinctLevel, { ...show, outlines: false }), boroughLayers('Bronx').precinctLine)).toBe(0.8)
  })

  it('fades borough names out and the focused borough’s precinct numbers in', () => {
    const map = paint(queens)
    expect(opacity(map, LAYERS.boroughLabel)).toBe(0)
    expect(opacity(map, LAYERS.precinctLabel)).toBe(1)
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctLabel, ['==', ['get', 'borough'], 'Queens'])
  })

  it('shows borough names at city level', () => {
    const map = paint(base)
    expect(opacity(map, LAYERS.boroughLabel)).toBe(1)
    expect(opacity(map, LAYERS.precinctLabel)).toBe(0)
  })

  it('places no precinct numbers at city level, where invisible ones would crowd out borough names', () => {
    expect(paint(base).setFilter).toHaveBeenCalledWith(LAYERS.precinctLabel, ['==', ['get', 'borough'], ''])
  })

  it('hides every name when Place labels is off', () => {
    expect(opacity(paint(base, { ...show, labels: false }), LAYERS.boroughLabel)).toBe(0)
    expect(opacity(paint(queens, { ...show, labels: false }), LAYERS.precinctLabel)).toBe(0)
  })

  it('outlines every precinct of the pinned area', () => {
    const map = paint(queens, { ...show, pinned: [105, 116] })
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHighlight, ['in', ['get', 'precinct'], ['literal', [105, 116]]])
    expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYERS.precinctHighlight, 'visibility', 'visible')
  })

  it('shows no highlight without a pin', () => {
    expect(paint(queens).setLayoutProperty).toHaveBeenCalledWith(LAYERS.precinctHighlight, 'visibility', 'none')
  })
})

describe('paintHover', () => {
  const areas = [
    { id: '105+116', label: 'Precincts 105 & 116', borough: 'Queens' as const, precincts: [105, 116] },
    { id: '44', label: 'Precinct 44', borough: 'Bronx' as const, precincts: [44] },
  ]

  it('outlines the borough under the pointer', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'borough', borough: 'Queens' }, areas)
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], 'Queens'])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })

  it('outlines every precinct of the area under the pointer', () => {
    const map = fakeMap()
    paintHover(map, { kind: 'precinct', precinct: 116 }, areas)
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', [105, 116]]])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], ''])
  })

  it('outlines nothing when the pointer leaves', () => {
    const map = fakeMap()
    paintHover(map, null, areas)
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], ''])
    expect(map.setFilter).toHaveBeenCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })
})
