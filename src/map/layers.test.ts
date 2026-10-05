import { expression } from '@maplibre/maplibre-gl-style-spec'
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
    expect(sources[SOURCES.firehouses]).toMatchObject({ type: 'geojson', promoteId: 'id' })
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
      ...perBorough('firehouseRing'),
      ...perBorough('firehouse'),
      LAYERS.firehouseHover,
      LAYERS.boroughLabel,
      LAYERS.precinctLabel,
      LAYERS.battalionLabel,
    ])
  })

  it('gives each borough its own layers, so each can fade on its own', () => {
    for (const b of BOROUGHS) {
      for (const id of Object.values(boroughLayers(b))) {
        if (id === boroughLayers(b).firehouseRing) continue // also filtered by rank; tested below
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

describe('firehouse layers', () => {
  const layers = mapLayers(lightTheme)
  const byId = (id: string) => layers.find((l) => l.id === id) as { paint: Record<string, unknown> }

  it('starts hidden and fades like everything else', () => {
    for (const b of BOROUGHS) {
      expect(byId(boroughLayers(b).firehouse).paint).toMatchObject({
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
        'circle-opacity-transition': { duration: FADE_DURATION },
        'circle-stroke-opacity-transition': { duration: FADE_DURATION },
      })
    }
  })

  const evaluate = (spec: unknown, zoom: number, command: string | null) => {
    const parsed = expression.createExpression(spec)
    if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value))
    return parsed.value.evaluate({ zoom }, { type: 'Point', properties: { command }, geometry: [] } as never)
  }

  it('marks each rank of command more heavily: battalion larger with a heavier ring, division and borough filled', () => {
    const paint = byId(boroughLayers('Queens').firehouse).paint
    for (const zoom of [10, 12, 14]) {
      const radius = (rank: string | null) => evaluate(paint['circle-radius'], zoom, rank) as number
      const ring = (rank: string | null) => evaluate(paint['circle-stroke-width'], zoom, rank) as number
      expect(radius('battalion'), `at ${zoom}`).toBeGreaterThan(radius(null))
      expect(ring('battalion'), `at ${zoom}`).toBeGreaterThan(ring(null))
      expect(radius('borough'), `at ${zoom}`).toBeGreaterThanOrEqual(radius('division'))
    }
    const fill = (rank: string | null) => evaluate(paint['circle-color'], 12, rank)
    expect([null, 'battalion', 'division', 'borough'].map((r) => String(fill(r)))).toEqual(
      [lightTheme.color.firehouse, lightTheme.color.firehouse, lightTheme.color.firehouseRing, lightTheme.color.firehouseRing].map((c) => String(evaluate(c, 12, null))),
    )
  })

  it('rings borough command headquarters a second time, and only those', () => {
    for (const b of BOROUGHS) {
      const ring = layers.find((l) => l.id === boroughLayers(b).firehouseRing) as { filter: unknown; paint: Record<string, unknown> }
      expect(ring.filter).toEqual(['all', ['==', ['get', 'borough'], b], ['==', ['get', 'command'], 'borough']])
      expect(ring.paint).toMatchObject({ 'circle-opacity': 0, 'circle-stroke-opacity': 0, 'circle-stroke-color': lightTheme.color.firehouseRing })
    }
  })

  it('outlines no firehouse until the pointer is over one', () => {
    expect((layers.find((l) => l.id === LAYERS.firehouseHover) as { filter: unknown }).filter).toEqual(['in', ['get', 'id'], ['literal', []]])
  })
})
