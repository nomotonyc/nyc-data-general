import { describe, expect, it } from 'vitest'
import { FIREHOUSES, FIREHOUSE_METHOD, FIREHOUSE_SOURCE, firehouseSourceUsed } from './firehouses'

describe('firehouse data', () => {
  it('holds every firehouse the build wrote, each in a borough', () => {
    expect(FIREHOUSES.length).toBe(219)
    expect(new Set(FIREHOUSES.map((f) => f.borough))).toEqual(new Set(['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']))
  })

  it('credits the listing with the month and year the city last updated it, read from the file', () => {
    expect(firehouseSourceUsed('2022-04-08')).toBe('Firehouse locations and units, as the city last updated them in April 2022')
    expect(FIREHOUSE_SOURCE.used).toMatch(/April 2022$/)
    expect(FIREHOUSE_SOURCE.url).toBe('https://data.cityofnewyork.us/d/hc8x-tcnd')
  })

  it('explains the marker ranks, what the panel counts, and that it predates any later change', () => {
    const text = FIREHOUSE_METHOD.join(' ')
    expect(text).toMatch(/battalion.*division.*borough command/i)
    expect(text).toMatch(/where firehouses stand/)
    expect(text).toMatch(/April 2022/)
  })
})
