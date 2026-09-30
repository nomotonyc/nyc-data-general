import { describe, expect, it } from 'vitest'
import { getDataset } from './load'

describe('getDataset', () => {
  it('returns the dataset for the story asked for', () => {
    expect(getDataset('fire').storyId).toBe('fire')
    expect(getDataset('demographic').storyId).toBe('demographic')
  })

  it('builds each dataset once', () => {
    expect(getDataset('medical')).toBe(getDataset('medical'))
  })

  it('serves sample data until real data lands', () => {
    expect(getDataset('fire').isSample).toBe(true)
  })
})
