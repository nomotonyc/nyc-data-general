import { describe, expect, it, vi } from 'vitest'
import { LAYERS, SOURCES } from './config'
import type { Choropleth } from './choropleth'
import { paintMap } from './paint'

const fakeMap = () => ({ setFeatureState: vi.fn(), removeFeatureState: vi.fn(), setLayoutProperty: vi.fn() })
const base: Choropleth = { level: 'borough', boroughs: {}, precincts: {}, lo: 0, hi: 1, range: { from: 2025, to: 2025 }, adjusted: false }
const show = { outlines: true, labels: true }

describe('paintMap', () => {
  it('clears earlier colours before painting new ones', () => {
    const map = fakeMap()
    paintMap(map, base, show)
    expect(map.removeFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs })
    expect(map.removeFeatureState).toHaveBeenCalledWith({ source: SOURCES.precincts })
  })

  it('sets each borough’s and precinct’s fill', () => {
    const map = fakeMap()
    paintMap(map, { ...base, boroughs: { Queens: '#111111' }, precincts: { 116: '#222222' } }, show)
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.boroughs, id: 'Queens' }, { fill: '#111111' })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: SOURCES.precincts, id: 116 }, { fill: '#222222' })
  })

  it('shows precinct outlines only when asked, except at precinct level where they separate the colours', () => {
    const visibility = (plan: Choropleth, outlines: boolean) => {
      const map = fakeMap()
      paintMap(map, plan, { outlines, labels: true })
      return map.setLayoutProperty.mock.calls.find(([id]) => id === LAYERS.precinctLine)?.[2]
    }
    expect(visibility(base, true)).toBe('visible')
    expect(visibility(base, false)).toBe('none')
    expect(visibility({ ...base, level: 'precinct' }, false)).toBe('visible')
  })

  it('shows or hides the borough names', () => {
    const map = fakeMap()
    paintMap(map, base, { outlines: true, labels: false })
    expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYERS.boroughLabel, 'visibility', 'none')
  })
})
