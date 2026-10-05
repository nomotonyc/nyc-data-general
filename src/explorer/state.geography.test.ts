import { describe, expect, it, vi } from 'vitest'
import type { Metric } from '../layers'

// Every real layer has battalions; this adds one that doesn't, to exercise the fallbacks.
vi.mock('../layers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../layers')>()
  const precinctOnly: Metric = { ...actual.getLayer('fire-apparatus-accidents'), id: 'precinct-only', order: 9, geographies: undefined }
  const LAYERS = [...actual.LAYERS, precinctOnly]
  return {
    ...actual,
    LAYERS,
    getLayer: (id: string) => (id === precinctOnly.id ? precinctOnly : actual.getLayer(id)),
    layersOf: (story: string) => LAYERS.filter((l) => l.story === story),
  }
})

const { explorerReducer: reduce, initialExplorerState } = await import('./state')
const fires = { ...initialExplorerState, storyId: 'fire' as const, metricId: 'fire-apparatus-accidents' }

describe('a layer without battalions', () => {
  it('refuses to switch to battalions', () => {
    const s = { ...fires, metricId: 'precinct-only' }
    expect(reduce(s, { type: 'setGeography', geography: 'battalions' })).toBe(s)
  })

  it('takes the view back to precincts and drops a battalion pin when picked, keeping the borough', () => {
    const inBattalions = { ...fires, geography: 'battalions' as const, borough: 'Bronx' as const, pinnedArea: 'bn14' }
    expect(reduce(inBattalions, { type: 'selectMetric', metricId: 'precinct-only' })).toMatchObject({
      geography: 'precincts',
      pinnedArea: null,
      borough: 'Bronx',
    })
  })
})
