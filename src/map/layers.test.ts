import { describe, expect, it } from 'vitest'
import { BOROUGHS } from '../domain/geography'
import { lightTheme } from '../theme/tokens'
import { FADE_DURATION, LAYERS, SOURCES, boroughLayers } from './config'
import { mapLayers, mapSources } from './layers'

describe('mapSources', () => {
  it('keys boroughs by name and precincts by number, so colours can be set per feature', () => {
    const sources = mapSources()
    expect(sources[SOURCES.boroughs]).toMatchObject({ type: 'geojson', promoteId: 'borough' })
    expect(sources[SOURCES.precincts]).toMatchObject({ type: 'geojson', promoteId: 'precinct' })
    expect(sources[SOURCES.precinctLabels]).toMatchObject({ type: 'geojson' })
  })
})

describe('mapLayers', () => {
  const layers = mapLayers(lightTheme)
  const byId = (id: string) => layers.find((l) => l.id === id)!
  const perBorough = (key: keyof ReturnType<typeof boroughLayers>) => BOROUGHS.map((b) => boroughLayers(b)[key])

  it('stacks every fill under every line, then the highlight, then labels', () => {
    expect(layers.map((l) => l.id)).toEqual([
      ...perBorough('boroughFill'),
      ...perBorough('precinctFill'),
      ...perBorough('battalionFill'),
      ...perBorough('precinctLine'),
      ...perBorough('battalionLine'),
      ...perBorough('boroughLine'),
      LAYERS.boroughHover,
      LAYERS.precinctHover,
      LAYERS.precinctHighlight,
      LAYERS.battalionHover,
      LAYERS.battalionHighlight,
      LAYERS.boroughLabel,
      LAYERS.precinctLabel,
      LAYERS.battalionLabel,
    ])
  })

  it('gives each borough its own layers, so each can fade on its own', () => {
    for (const b of BOROUGHS) {
      for (const id of Object.values(boroughLayers(b))) {
        expect((byId(id) as { filter?: unknown }).filter, id).toEqual(['==', ['get', 'borough'], b])
      }
    }
  })

  it('fades opacity changes over the prototype’s duration', () => {
    for (const b of BOROUGHS) {
      const ids = boroughLayers(b)
      expect(byId(ids.boroughFill).paint).toMatchObject({ 'fill-opacity-transition': { duration: FADE_DURATION } })
      expect(byId(ids.precinctFill).paint).toMatchObject({ 'fill-opacity-transition': { duration: FADE_DURATION } })
      expect(byId(ids.precinctLine).paint).toMatchObject({ 'line-opacity-transition': { duration: FADE_DURATION } })
      expect(byId(ids.boroughLine).paint).toMatchObject({ 'line-opacity-transition': { duration: FADE_DURATION } })
    }
    for (const id of [LAYERS.boroughLabel, LAYERS.precinctLabel]) {
      expect(byId(id).paint, id).toMatchObject({ 'text-opacity-transition': { duration: FADE_DURATION } })
    }
  })

  it('reads fills from feature state', () => {
    for (const b of BOROUGHS) {
      const ids = boroughLayers(b)
      for (const id of [ids.boroughFill, ids.precinctFill]) expect(JSON.stringify(byId(id).paint), id).toContain('feature-state')
    }
  })

  it('starts with precincts and their numbers faded out', () => {
    for (const b of BOROUGHS) {
      expect(byId(boroughLayers(b).precinctFill).paint).toMatchObject({ 'fill-opacity': 0 })
      expect(byId(boroughLayers(b).precinctLine).paint).toMatchObject({ 'line-opacity': 0 })
    }
    expect(byId(LAYERS.precinctLabel).paint).toMatchObject({ 'text-opacity': 0 })
  })

  it('never lets precinct numbers block borough names while they fade', () => {
    expect(byId(LAYERS.precinctLabel).layout).toMatchObject({ 'text-ignore-placement': true })
  })

  it('starts with the pin highlight hidden', () => {
    expect(byId(LAYERS.precinctHighlight).layout).toMatchObject({ visibility: 'none' })
  })
})
