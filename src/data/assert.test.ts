import { describe, expect, it } from 'vitest'
import { STORIES, getStory } from '../domain/stories'
import { assertDataset } from './assert'
import type { StoryDataset } from './dataset'
import { generateSampleDataset } from './sample'

const fire = getStory('fire')
const demographic = getStory('demographic')

/** The fire sample with one area's structural-fires series replaced. */
function fireWith(values: number[] | undefined): StoryDataset {
  const ds = generateSampleDataset(fire)
  const byArea: Record<string, readonly number[]> = { ...ds.values['structural-fires'] }
  if (values) byArea['1'] = values
  else delete byArea['1']
  return { ...ds, values: { ...ds.values, 'structural-fires': byArea } }
}

describe('assertDataset', () => {
  it.each(STORIES.map((s) => [s.id, s] as const))('accepts the %s sample dataset', (_, story) => {
    expect(() => assertDataset(generateSampleDataset(story), story)).not.toThrow()
  })

  it('rejects a dataset built for another story', () => {
    expect(() => assertDataset(generateSampleDataset(fire), demographic)).toThrow(/expected story demographic/)
  })

  it('rejects a dataset with no periods', () => {
    expect(() => assertDataset({ ...generateSampleDataset(fire), periods: [] }, fire)).toThrow(/no periods/)
  })

  it('names a missing layer', () => {
    expect(() => assertDataset({ ...generateSampleDataset(fire), values: {} }, fire)).toThrow(/no layer structural-fires/)
  })

  it('names an area with no values', () => {
    expect(() => assertDataset(fireWith(undefined), fire)).toThrow(/no values for area 1\b/)
  })

  it('names an area whose series is shorter than the periods', () => {
    const short = generateSampleDataset(fire).values['structural-fires']['1'].slice(0, -1)
    expect(() => assertDataset(fireWith(short), fire)).toThrow(/area 1 has length 89, expected 90/)
  })

  it('names the area and period of a value that is not a finite number', () => {
    const bad = [...generateSampleDataset(fire).values['structural-fires']['1']]
    bad[3] = Number.NaN
    expect(() => assertDataset(fireWith(bad), fire)).toThrow(/area 1 has NaN at period 3/)
  })

  it('requires denominators for ratio layers', () => {
    const ds = { ...generateSampleDataset(demographic), denominators: {} }
    expect(() => assertDataset(ds, demographic)).toThrow(/no denominators for ratio layer population-density/)
  })

  it('requires every denominator to be positive', () => {
    const ds = generateSampleDataset(demographic)
    const land = [...ds.denominators['population-density']['22']]
    land[0] = 0
    const broken = {
      ...ds,
      denominators: { 'population-density': { ...ds.denominators['population-density'], 22: land } },
    }
    expect(() => assertDataset(broken, demographic)).toThrow(/denominator for area 22 has 0 at period 0/)
  })

  it('names a breakdown entry with the wrong number of parts', () => {
    const ds = generateSampleDataset(fire)
    const periods = [...ds.parts['1']]
    periods[2] = [1]
    expect(() => assertDataset({ ...ds, parts: { ...ds.parts, 1: periods } }, fire)).toThrow(
      /breakdown for area 1 is malformed at period 2/,
    )
  })
})
