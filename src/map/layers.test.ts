import { describe, expect, it } from 'vitest'
import { lightTheme } from '../theme/tokens'
import { LAYERS, SOURCES } from './config'
import { mapLayers, mapSources } from './layers'

describe('mapSources', () => {
  it('keys boroughs by name and precincts by number, so colours can be set per feature', () => {
    const sources = mapSources()
    expect(sources[SOURCES.boroughs]).toMatchObject({ type: 'geojson', promoteId: 'borough' })
    expect(sources[SOURCES.precincts]).toMatchObject({ type: 'geojson', promoteId: 'precinct' })
  })
})

describe('mapLayers', () => {
  const layers = mapLayers(lightTheme)
  const ids = layers.map((l) => l.id)

  it('stacks fills under lines under labels', () => {
    expect(ids).toEqual([LAYERS.boroughFill, LAYERS.precinctFill, LAYERS.precinctLine, LAYERS.boroughLine, LAYERS.boroughLabel])
  })

  it('reads fills from feature state', () => {
    for (const id of [LAYERS.boroughFill, LAYERS.precinctFill]) {
      const layer = layers.find((l) => l.id === id)!
      expect(JSON.stringify(layer.paint), id).toContain('feature-state')
    }
  })

  it('starts with precinct outlines hidden', () => {
    expect(layers.find((l) => l.id === LAYERS.precinctLine)!.layout).toEqual({ visibility: 'none' })
  })
})
