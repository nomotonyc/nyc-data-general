import { describe, expect, it } from 'vitest'
import { BOROUGHS, PRECINCTS, PRECINCT_AREAS, areaOfPrecinct, boroughInSentence, boroughOfPrecinct, isPrecinct, precinctsIn, dispatchPrecinct } from './geography'

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

  it('keeps 105 and 116 apart', () => {
    expect(areaOfPrecinct(PRECINCT_AREAS, 116).id).toBe('116')
  })

  it('rejects a precinct no area contains', () => {
    expect(() => areaOfPrecinct(PRECINCT_AREAS, 2)).toThrow(/precinct 2/)
  })
})

describe('dispatchPrecinct', () => {
  // NYPD created 116 from 105 in late 2024; older records, and most EMS records, still say 105.
  it('places 105 and 116 records by ZIP code', () => {
    expect(dispatchPrecinct('105', '11413')).toBe(116)
    expect(dispatchPrecinct('105', '11434')).toBe(116)
    expect(dispatchPrecinct('116', '11429')).toBe(105)
    expect(dispatchPrecinct('105', '11411')).toBe(105)
  })

  it('keeps the recorded precinct when there is no ZIP code', () => {
    expect(dispatchPrecinct('105', undefined)).toBe(105)
    expect(dispatchPrecinct('116', '')).toBe(116)
  })

  it('leaves every other precinct as recorded, even in a shared ZIP code', () => {
    expect(dispatchPrecinct('113', '11434')).toBe(113)
    expect(dispatchPrecinct('044', '10452')).toBe(44)
  })
})
