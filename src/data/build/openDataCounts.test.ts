import { describe, expect, it } from 'vitest'
import { getLayer, type Metric, type OpenDataCountsBuild } from '../../layers'
import { aggregateCounts, countQuery, type CountRow } from './openDataCounts'

const fires = getLayer('structural-fires')
const build = fires.build as OpenDataCountsBuild
const row = (precinct: string | undefined, month: string, part: string, n: number, zip?: string): CountRow => ({
  precinct,
  zip,
  month: `${month}-01T00:00:00.000`,
  part,
  n: String(n),
})
const house = 'Private Dwelling Fire'
const stove = "Multiple Dwelling 'A' - Food on the stove fire"
const partIndex = (label: string) => fires.breakdown.parts.indexOf(label)
const at = (year: number, month: number) => (year - 2019) * 12 + month

describe('countQuery', () => {
  it('asks the API for one month, grouped by precinct, ZIP code, month and part', () => {
    const url = new URL(countQuery(build, { year: 2025, month: 2 }))
    expect(url.origin + url.pathname).toBe('https://data.cityofnewyork.us/resource/8m42-w767.json')
    const p = url.searchParams
    expect(p.get('$select')).toBe(
      'policeprecinct as precinct, zipcode as zip, date_trunc_ym(incident_datetime) as month, incident_classification as part, count(*) as n',
    )
    expect(p.get('$where')).toBe(
      "(incident_classification_group = 'Structural Fires') AND incident_datetime >= '2025-03-01T00:00:00' AND incident_datetime < '2025-04-01T00:00:00'",
    )
    expect(p.get('$group')).toBe('precinct, zip, month, part')
    expect(Number(p.get('$limit'))).toBeGreaterThanOrEqual(50000)
  })

  it('ends December at the start of the next year', () => {
    expect(new URL(countQuery(build, { year: 2025, month: 11 })).searchParams.get('$where')).toContain(
      "incident_datetime >= '2025-12-01T00:00:00' AND incident_datetime < '2026-01-01T00:00:00'",
    )
  })
})

describe('aggregateCounts', () => {
  it('counts by area, month and part, with every other month 0', () => {
    const { file } = aggregateCounts(fires, [row('44', '2025-03', house, 4), row('44', '2025-03', stove, 6)])
    expect(file.layerId).toBe('structural-fires')
    expect(file.values['44'][at(2025, 2)]).toBe(10)
    expect(file.values['44'][at(2025, 3)]).toBe(0)
    expect(file.parts['44'][at(2025, 2)][partIndex('House')]).toBe(4)
    expect(file.parts['44'][at(2025, 2)][partIndex('Apartment building')]).toBe(6)
    expect(file.values['1'].every((v) => v === 0)).toBe(true)
  })

  it('covers every area and period, even without records', () => {
    const { file } = aggregateCounts(fires, [])
    expect(Object.keys(file.values)).toHaveLength(78)
    expect(file.values['116']).toHaveLength(90)
    expect(file.from).toBe('2019-01')
    expect(file.to).toBe('2026-06')
  })

  it('tells 105 and 116 apart by ZIP code', () => {
    const { file } = aggregateCounts(fires, [
      row('105', '2020-01', house, 3, '11413'),
      row('105', '2020-01', house, 2, '11429'),
      row('116', '2025-01', house, 4, '11422'),
    ])
    expect(file.values['116'][at(2020, 0)]).toBe(3)
    expect(file.values['105'][at(2020, 0)]).toBe(2)
    expect(file.values['116'][at(2025, 0)]).toBe(4)
  })

  it('leaves out records with no precinct, and reports them by year', () => {
    const { file, report } = aggregateCounts(fires, [row(undefined, '2025-01', house, 7), row('44', '2025-01', house, 3)])
    expect(Object.values(file.values).flat().reduce((a, b) => a + b, 0)).toBe(3)
    expect(report.find((r) => r.year === 2025)).toEqual({ year: 2025, counted: 3, noPrecinct: 7 })
  })

  it('ignores months after June of the final year', () => {
    const { report } = aggregateCounts(fires, [row('44', '2026-07', house, 9)])
    expect(report.find((r) => r.year === 2026)).toEqual({ year: 2026, counted: 0, noPrecinct: 0 })
  })

  it('fails on a raw value no part lists, naming it', () => {
    expect(() => aggregateCounts(fires, [row('44', '2025-01', 'Boat Fire', 1)])).toThrow(/incident_classification "Boat Fire" is in no part/)
  })

  it('fails on a precinct NYPD does not have, naming it', () => {
    expect(() => aggregateCounts(fires, [row('99', '2025-01', house, 1)])).toThrow(/precinct "99"/)
  })

  it('refuses layers it cannot build', () => {
    const density = getLayer('population-density') as Metric
    expect(() => aggregateCounts(density, [])).toThrow(/population-density/)
  })
})

describe('ratio layers', () => {
  const responseTime = getLayer('ambulance-response-time')
  const rt = (precinct: string, part: string, n: number, total: number): CountRow => ({
    precinct,
    zip: '10001',
    month: '2025-03-01T00:00:00.000',
    part,
    n: String(n),
    total: String(total),
  })

  it('also asks the API for the sum of the field', () => {
    expect(new URL(countQuery(responseTime.build as OpenDataCountsBuild, { year: 2025, month: 2 })).searchParams.get('$select')).toMatch(
      /, count\(\*\) as n, sum\(incident_response_seconds_qy\) as total$/,
    )
  })

  it('keeps the summed field as values and the count as denominators', () => {
    const { file } = aggregateCounts(responseTime, [rt('14', 'Under 5 minutes', 10, 2400), rt('14', '5 to 10 minutes', 5, 2100)])
    expect(file.values['14'][at(2025, 2)]).toBe(4500)
    expect(file.denominators!['14'][at(2025, 2)]).toBe(15)
    expect(file.parts['14'][at(2025, 2)]).toEqual([10, 5, 0, 0, 0])
  })
})
