import { describe, expect, it } from 'vitest'
import { getLayer } from '../layers'
import { layerPeriods } from './coverage'
import { datasetFromFile, type LayerFile } from './file'

const fires = getLayer('structural-fires')
const zeros = () => layerPeriods(fires).map(() => 0)
const file = (): LayerFile => {
  const values: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const id of ['1', '5', '116']) {
    values[id] = zeros()
    parts[id] = zeros().map(() => fires.breakdown.parts.map(() => 0))
  }
  return { layerId: 'structural-fires', built: '2026-09-30T00:00:00Z', from: '2019-01', to: '2026-06', values, parts }
}

describe('datasetFromFile', () => {
  it('turns a layer file into a real, complete dataset', () => {
    const f = file()
    const ds = datasetFromFile(fires, f, ['1', '5', '116'])
    expect(ds.isSample).toBe(false)
    expect(ds.periods).toEqual(layerPeriods(fires))
    expect(ds.areas.map((a) => a.id)).toEqual(['1', '5', '116'])
    expect(ds.values['structural-fires']).toBe(f.values)
  })

  it('names the layer when an area is missing', () => {
    const f = file()
    delete f.values['5']
    expect(() => datasetFromFile(fires, f, ['1', '5', '116'])).toThrow(/structural-fires.*area 5/)
  })

  it('refuses a file covering different months than the layer', () => {
    expect(() => datasetFromFile(fires, { ...file(), to: '2026-03' }, ['1'])).toThrow(/structural-fires covers 2019-01 to 2026-03, expected 2019-01 to 2026-06/)
  })

  it('refuses a file for another layer', () => {
    expect(() => datasetFromFile(fires, { ...file(), layerId: 'ambulance-calls' }, ['1'])).toThrow(/ambulance-calls/)
  })
})

describe('placement', () => {
  it('carries how a battalion file placed its records into the dataset', () => {
    const placement = [{ method: 'each crash’s coordinates', share: 1, exact: true }]
    const f = { ...file(), geography: 'battalions' as const, placement, values: { bn14: zeros() }, parts: { bn14: zeros().map(() => fires.breakdown.parts.map(() => 0)) } }
    expect(datasetFromFile(fires, f, ['bn14']).placement).toEqual(placement)
  })

  it('refuses shares that do not add up to the whole', () => {
    const placement = [{ method: 'alarm box', share: 0.7, exact: true }]
    const f = { ...file(), geography: 'battalions' as const, placement, values: { bn14: zeros() }, parts: { bn14: zeros().map(() => fires.breakdown.parts.map(() => 0)) } }
    expect(() => datasetFromFile(fires, f, ['bn14'])).toThrow(/placement shares add to 70%/)
  })
})
