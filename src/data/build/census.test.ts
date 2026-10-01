import { describe, expect, it } from 'vitest'
import { getLayer } from '../../layers'
import { AGE_GROUPS, apportion, densityFile, parseAcsTracts, parseBlock, SQ_M_PER_SQ_MI, type Block } from './census'
import type { PrecinctShapes } from './openDataPoints'

/** A P.L. 94-171 geographic header line: 97 pipe-separated fields, the ones used filled in. */
function plLine(fields: Record<number, string>): string {
  const x = Array<string>(97).fill('')
  for (const [i, v] of Object.entries(fields)) x[Number(i)] = v
  return x.join('|')
}
const block = (geocode: string, pop: number, land: number, lat: number, lon: number) =>
  plLine({ 2: '750', 9: geocode, 84: String(land), 90: String(pop), 92: `+${lat}`, 93: String(lon) })

describe('parseBlock', () => {
  it('reads an NYC census block: tract, population, land and interior point', () => {
    expect(parseBlock(block('360610001001000', 120, 5000, 40.7, -74.0))).toEqual({
      tract: '36061000100',
      population: 120,
      landSqM: 5000,
      lat: 40.7,
      lon: -74,
    })
  })

  it('skips other summary levels and counties outside the city', () => {
    expect(parseBlock(plLine({ 2: '140', 9: '36061000100' }))).toBeNull()
    expect(parseBlock(block('360090001001000', 5, 5, 42, -79))).toBeNull()
  })
})

describe('parseAcsTracts', () => {
  const header = ['GEO_ID', ...Array.from({ length: 49 }, (_, i) => [`B01001_E${String(i + 1).padStart(3, '0')}`, `B01001_M${String(i + 1).padStart(3, '0')}`]).flat()].join('|')
  // Every age cell 1, except male under 5 (E003) = 10 and female 85+ (E049) = 20.
  const row = (geoid: string) => {
    const cells = Array.from({ length: 49 }, (_, i) => (i === 0 ? '1000' : i === 2 ? '10' : i === 48 ? '20' : '1'))
    return [geoid, ...cells.flatMap((e) => [e, '0'])].join('|')
  }

  it('reads total population and the four age groups for NYC tracts only', () => {
    const tracts = parseAcsTracts([header, row('1400000US36047000100'), row('1400000US36009000100'), row('0400000US36')])
    expect([...tracts.keys()]).toEqual(['36047000100'])
    // Under 18: E003–E006 and E027–E030 = 10+1+1+1 + 4; 18–34: 6+6; 35–64: 7+7; 65+: 6 + 5+20.
    expect(tracts.get('36047000100')).toEqual({ population: 1000, ages: [17, 12, 14, 31] })
  })

  it('groups every age cell exactly once', () => {
    const cells = AGE_GROUPS.flat()
    expect(new Set(cells).size).toBe(cells.length)
    expect(cells).toHaveLength(46)
  })
})

describe('apportion and densityFile', () => {
  // Precinct 1 is the left half, precinct 5 the right half.
  const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]
  const shapes: PrecinctShapes = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { precinct: 1 }, geometry: { type: 'MultiPolygon', coordinates: [[square(0, 0, 10)]] } },
      { type: 'Feature', properties: { precinct: 5 }, geometry: { type: 'MultiPolygon', coordinates: [[square(10, 0, 10)]] } },
    ],
  }
  const b = (tract: string, population: number, landSqM: number, lon: number): Block => ({ tract, population, landSqM, lat: 5, lon })
  // Tract A: 300 people in precinct 1, 100 in precinct 5. Tract B: 0 people, in the water.
  const blocks = [b('A', 300, SQ_M_PER_SQ_MI, 2), b('A', 100, SQ_M_PER_SQ_MI, 12), b('B', 0, 1000, 30)]

  it('totals land per precinct and each tract’s population per precinct', () => {
    const w = apportion(blocks, shapes)
    expect(w.landSqMi.get(1)).toBeCloseTo(1)
    expect(w.tractShares.get('A')).toEqual(new Map([[1, 0.75], [5, 0.25]]))
    expect(w.unplacedBlocks).toEqual({ blocks: 1, population: 0 })
  })

  it('splits each year’s ACS estimates by those shares, with land as the denominator', () => {
    const layer = getLayer('population-density')
    const acs = new Map([['A', { population: 1000, ages: [200, 300, 400, 100] }]])
    const { file, report } = densityFile(layer, apportion(blocks, shapes), new Map([[2021, acs], [2022, acs], [2023, acs], [2024, acs]]), ['1', '5'])
    expect(file.values['1']).toEqual([750, 750, 750, 750])
    expect(file.values['5'][0]).toBe(250)
    expect(file.denominators!['1'][0]).toBeCloseTo(1)
    expect(file.parts['1'][0]).toEqual([150, 225, 300, 75])
    expect(report[0]).toEqual({ year: 2021, counted: 1000, unplaced: 0 })
  })

  it('reports ACS population in tracts with no 2020 residents to split it by', () => {
    const acs = new Map([['A', { population: 1000, ages: [250, 250, 250, 250] }], ['B', { population: 40, ages: [10, 10, 10, 10] }]])
    const { report } = densityFile(getLayer('population-density'), apportion(blocks, shapes), new Map([[2021, acs], [2022, acs], [2023, acs], [2024, acs]]), ['1', '5'])
    expect(report[0]).toEqual({ year: 2021, counted: 1000, unplaced: 40 })
  })
})
