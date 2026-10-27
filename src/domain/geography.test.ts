import { describe, expect, it } from 'vitest'
import {
  BATTALIONS,
  BATTALION_AREAS,
  BOROUGHS,
  DIVISIONS,
  DIVISION_AREAS,
  PRECINCTS,
  PRECINCT_AREAS,
  areaById,
  areaNoun,
  areasOf,
  boroughInSentence,
  boroughOfPrecinct,
  dispatchPrecinct,
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

describe('precinct areas', () => {
  it('gives every precinct one area, numbered and labelled', () => {
    expect(PRECINCT_AREAS).toHaveLength(78)
    expect(PRECINCT_AREAS.find((a) => a.id === '14')).toEqual({ id: '14', kind: 'precinct', number: 14, label: 'Precinct 14', borough: 'Manhattan' })
    expect(PRECINCT_AREAS.map((a) => a.number)).toEqual(PRECINCTS)
  })
})

describe('battalions', () => {
  it('lists the 49 FDNY battalions once each, in ascending order, each in one borough', () => {
    expect(BATTALIONS).toHaveLength(49)
    const numbers = BATTALIONS.map((b) => b.number)
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers)
    expect(new Set(numbers).size).toBe(49)
  })

  it('splits across the boroughs as the shapes do', () => {
    const counts = Object.fromEntries(BOROUGHS.map((b) => [b, BATTALIONS.filter((x) => x.borough === b).length]))
    expect(counts).toEqual({ Manhattan: 12, Bronx: 9, Brooklyn: 16, Queens: 9, 'Staten Island': 3 })
  })

  it('gives each battalion an area with an id no precinct can share', () => {
    expect(BATTALION_AREAS.find((a) => a.number === 14)).toEqual({ id: 'bn14', kind: 'battalion', number: 14, label: 'Battalion 14', borough: 'Bronx' })
    const precinctIds = new Set(PRECINCT_AREAS.map((a) => a.id))
    for (const a of BATTALION_AREAS) expect(precinctIds.has(a.id)).toBe(false)
  })
})

describe('divisions', () => {
  it('lists the nine FDNY divisions and assigns every battalion exactly once', () => {
    expect(DIVISIONS.map((division) => division.number)).toEqual([1, 3, 6, 7, 8, 11, 13, 14, 15])
    const battalions = DIVISIONS.flatMap((division) => division.battalions).sort((a, b) => a - b)
    expect(battalions).toEqual(BATTALIONS.map((battalion) => battalion.number))
  })

  it('gives every division a unique area id', () => {
    expect(DIVISION_AREAS.find((area) => area.number === 14)).toEqual({ id: 'div14', kind: 'division', number: 14, label: 'Division 14', borough: 'Queens' })
    expect(new Set(DIVISION_AREAS.map((area) => area.id)).size).toBe(9)
  })
})

describe('areasOf and areaById', () => {
  it('returns the areas of a geography', () => {
    expect(areasOf('divisions')).toBe(DIVISION_AREAS)
    expect(areasOf('precincts')).toBe(PRECINCT_AREAS)
    expect(areasOf('battalions')).toBe(BATTALION_AREAS)
  })

  it('finds an area by id, and refuses one that is not there', () => {
    expect(areaById(PRECINCT_AREAS, '116').label).toBe('Precinct 116')
    expect(areaById(BATTALION_AREAS, 'bn3').borough).toBe('Bronx')
    expect(() => areaById(PRECINCT_AREAS, 'bn3')).toThrow(/bn3/)
  })

  it('names a geography’s areas', () => {
    expect(areaNoun('divisions')).toEqual({ one: 'division', many: 'divisions', title: 'Division' })
    expect(areaNoun('precincts')).toEqual({ one: 'precinct', many: 'precincts', title: 'Precinct' })
    expect(areaNoun('battalions')).toEqual({ one: 'battalion', many: 'battalions', title: 'Battalion' })
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
