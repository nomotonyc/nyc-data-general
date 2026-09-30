import { describe, expect, it } from 'vitest'
import { getDataset } from './load'

describe('getDataset', () => {
  it('returns the dataset for the layer asked for', () => {
    expect(getDataset('structural-fires').layerId).toBe('structural-fires')
    expect(getDataset('population-density').layerId).toBe('population-density')
  })

  it('builds each dataset once', () => {
    expect(getDataset('ems-calls')).toBe(getDataset('ems-calls'))
  })

  it('serves sample data until real data lands', () => {
    expect(getDataset('structural-fires').isSample).toBe(true)
  })

  it('refuses a layer that does not exist', () => {
    expect(() => getDataset('nope')).toThrow(/nope/)
  })
})
