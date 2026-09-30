import { describe, expect, it } from 'vitest'
import {
  BOROUGHS,
  DISPATCH_AREAS,
  PRECINCTS,
  PRECINCT_AREAS,
  areaOfPrecinct,
  boroughInSentence,
  boroughOfPrecinct,
  isPrecinct,
  precinctsIn,
} from './geography'

describe('PRECINCTS', () => {
  it('lists the 78 NYPD precincts once each, in ascending order', () => {
    expect(PRECINCTS).toHaveLength(78)
    expect([...PRECINCTS].sort((a, b) => a - b)).toEqual(PRECINCTS)
    expect(new Set(PRECINCTS).size).toBe(78)
  })

  it('splits across the boroughs as NYPD publishes them', () => {
    const counts = Object.fromEntries(BOROUGHS.map((b) => [b, precinctsIn(b).length]))
    expect(counts).toEqual({ Manhattan: 22, Bronx: 12, Brooklyn: 23, Queens: 17, 'Staten Island': 4 })
  })
})

describe('boroughOfPrecinct', () => {
  it.each([
    [1, 'Manhattan'],
    [34, 'Manhattan'],
    [40, 'Bronx'],
    [52, 'Bronx'],
    [60, 'Brooklyn'],
    [94, 'Brooklyn'],
    [100, 'Queens'],
    [116, 'Queens'],
    [120, 'Staten Island'],
    [123, 'Staten Island'],
  ])('puts precinct %i in %s', (precinct, borough) => {
    expect(boroughOfPrecinct(precinct)).toBe(borough)
  })

  it.each([0, 2, 35, 99, 124, 14.5, -1])('rejects %s, which is not a precinct', (n) => {
    expect(() => boroughOfPrecinct(n)).toThrow(RangeError)
    expect(() => boroughOfPrecinct(n)).toThrow(String(n))
  })
})

describe('isPrecinct', () => {
  it('is true only for listed precincts', () => {
    expect(isPrecinct(14)).toBe(true)
    expect(isPrecinct(2)).toBe(false)
  })
})

describe('boroughInSentence', () => {
  it('adds the article only for the Bronx', () => {
    expect(boroughInSentence('Bronx')).toBe('the Bronx')
    expect(boroughInSentence('Queens')).toBe('Queens')
  })
})

describe('map areas', () => {
  const coversEveryPrecinctOnce = (areas: typeof PRECINCT_AREAS) => {
    const all = areas.flatMap((a) => a.precincts)
    expect([...all].sort((a, b) => a - b)).toEqual(PRECINCTS)
  }

  it('gives census-based layers one area per precinct', () => {
    expect(PRECINCT_AREAS).toHaveLength(78)
    expect(PRECINCT_AREAS.find((a) => a.id === '14')).toEqual({
      id: '14',
      label: 'Precinct 14',
      borough: 'Manhattan',
      precincts: [14],
    })
    coversEveryPrecinctOnce(PRECINCT_AREAS)
  })

  it('merges 105 and 116 for dispatch layers', () => {
    expect(DISPATCH_AREAS).toHaveLength(77)
    coversEveryPrecinctOnce(DISPATCH_AREAS)
    const merged = areaOfPrecinct(DISPATCH_AREAS, 116)
    expect(merged).toEqual({ id: '105+116', label: 'Precincts 105 & 116', borough: 'Queens', precincts: [105, 116] })
    expect(areaOfPrecinct(DISPATCH_AREAS, 105)).toBe(merged)
  })

  it('keeps 105 and 116 apart for census-based layers', () => {
    expect(areaOfPrecinct(PRECINCT_AREAS, 116).id).toBe('116')
  })

  it('rejects a precinct no area contains', () => {
    expect(() => areaOfPrecinct(PRECINCT_AREAS, 2)).toThrow(/precinct 2/)
  })
})
