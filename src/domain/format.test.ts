import { describe, expect, it } from 'vitest'
import { compareToAverage, formatCompact, formatCount, formatWithUnit, ordinal } from './format'
import { getStory } from './stories'

describe('formatCount', () => {
  it.each([
    [1234.4, '1,234'],
    [112_209.2, '112,209'],
    [49, '49'],
    [4.26, '4.3'],
    [0, '0'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatCount(value)).toBe(expected)
  })
})

describe('formatCompact', () => {
  it.each([
    [1_613_554, '1.6M'],
    [31_717, '31.7K'],
    [120_169, '120.2K'],
    [9_999, '9,999'],
    [2_401, '2,401'],
    [4.26, '4.3'],
  ])('shortens %s to %s', (value, expected) => {
    expect(formatCompact(value)).toBe(expected)
  })
})

describe('formatWithUnit', () => {
  it('adds the layer’s unit', () => {
    expect(formatWithUnit(getStory('fire').metrics[0], 49)).toBe('49 fires')
    expect(formatWithUnit(getStory('demographic').metrics[0], 34_512.6)).toBe('34,513 people per sq mi')
  })
})

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [71, '71st'], [101, '101st'], [111, '111th'],
  ])('%i -> %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected)
  })
})

describe('compareToAverage', () => {
  it('rounds to whole percent above or below', () => {
    expect(compareToAverage(134, 100, 'the city average')).toBe('34% above the city average')
    expect(compareToAverage(76, 100, 'the Bronx average')).toBe('24% below the Bronx average')
  })
  it('calls values within half a percent level', () => {
    expect(compareToAverage(100.4, 100, 'the city average')).toBe('Level with the city average')
  })
  it('does not divide by a zero average', () => {
    expect(compareToAverage(0, 0, 'the city average')).toBe('Level with the city average')
    expect(compareToAverage(5, 0, 'the city average')).toBe('Above the city average')
  })
})
