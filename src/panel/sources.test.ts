import { describe, expect, it } from 'vitest'
import { FIREHOUSE_SOURCE } from '../data/firehouses'
import { initialExplorerState } from '../explorer/state'
import { BATTALION_BOUNDARIES, getLayer, layerSources } from '../layers'
import { shownSources } from './sources'

const fire = { ...initialExplorerState, storyId: 'fire' as const, metricId: 'structural-fires', geography: 'precincts' as const, showFirehouses: false }

describe('shownSources', () => {
  it('are the layer’s sources and method', () => {
    expect(shownSources(fire).sources).toEqual(layerSources(getLayer('structural-fires')))
    expect(shownSources(fire).method.length).toBeGreaterThan(0)
  })

  it('credit the firehouse listing and battalion boundaries while firehouses show, once each', () => {
    const { sources } = shownSources({ ...fire, showFirehouses: true })
    expect(sources).toContainEqual(FIREHOUSE_SOURCE)
    expect(sources.filter((s) => s.url === BATTALION_BOUNDARIES.url)).toHaveLength(1)
  })
})
