import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { areaIdsIn } from '../data/places'
import { areaValue, rankOf } from '../data/selectors'
import { formatCount, formatWithUnit, ordinal } from '../domain/format'
import { getStory } from '../domain/stories'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { hoverDetails, tooltipPosition } from './hover'
import { hoverTarget } from './interaction'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const ds = getDataset('fire')
const fires = getStory('fire').metrics[0]
const y2025 = { from: 2025, to: 2025 } as const
const borough = (name: string) => ({ kind: 'borough' as const, properties: { borough: name } })
const precinct = (n: number, b: string) => ({ kind: 'precinct' as const, properties: { precinct: n, borough: b } })

describe('hoverTarget', () => {
  it('is the borough at borough level', () => {
    expect(hoverTarget(fire, [precinct(114, 'Queens'), borough('Queens')])).toEqual({ kind: 'borough', borough: 'Queens' })
  })

  it('is the precinct at precinct level', () => {
    expect(hoverTarget({ ...fire, detail: 'precinct' }, [precinct(44, 'Bronx'), borough('Bronx')])).toEqual({
      kind: 'precinct',
      precinct: 44,
    })
  })

  it('is nothing over the hidden boroughs around a focused one', () => {
    expect(hoverTarget({ ...fire, borough: 'Queens' }, [precinct(75, 'Brooklyn')])).toBeNull()
  })
})

describe('hoverDetails for a precinct', () => {
  const state = { ...fire, detail: 'precinct' as const }
  const details = hoverDetails(state, ds, { kind: 'precinct', precinct: 44 })
  const values = ds.areas.map((a) => areaValue(ds, fires, [a.id], y2025))
  const bronx = ds.areas.filter((a) => a.borough === 'Bronx').map((a) => areaValue(ds, fires, [a.id], y2025))
  const own = areaValue(ds, fires, ['44'], y2025)

  it('names the precinct, its borough, the layer and years', () => {
    expect(details.title).toBe('Precinct 44')
    expect(details.subtitle).toBe('Bronx')
    expect(details.metric).toBe('Structural fires, 2025')
    expect(details.value).toBe(formatWithUnit(fires, own))
  })

  it('ranks it within its borough and across the city', () => {
    expect(details.ranks).toEqual([
      { label: 'In the Bronx', rank: ordinal(rankOf(own, bronx)), of: `of ${bronx.length}` },
      { label: 'Citywide', rank: ordinal(rankOf(own, values)), of: `of ${values.length}` },
    ])
  })

  it('places it, the city average and the borough average on a strip from lowest to highest', () => {
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const at = (v: number) => ((v - lo) / (hi - lo)) * 100
    expect(details.strip.dot).toBeCloseTo(at(own), 6)
    expect(details.strip.cityAverage).toBeCloseTo(at(values.reduce((a, b) => a + b) / values.length), 6)
    expect(details.strip.boroughAverage).toBeCloseTo(at(bronx.reduce((a, b) => a + b) / bronx.length), 6)
  })

  it('says what the strip spans and labels its two ends', () => {
    expect(details.strip.caption).toBe(`Among all ${values.length} precincts`)
    expect(details.strip.lo).toBe(formatCount(Math.min(...values)))
    expect(details.strip.hi).toBe(formatCount(Math.max(...values)))
  })

  it('compares it with both averages in words', () => {
    expect(details.comparisons[0]).toMatch(/(above|below|Level with) the city average$/)
    expect(details.comparisons[1]).toMatch(/(above|below|Level with) the Bronx average$/)
  })

  it('invites a click, or says it is pinned', () => {
    expect(details.hint).toBe('Click to pin this precinct')
    expect(hoverDetails({ ...state, pinnedPrecinct: 44 }, ds, { kind: 'precinct', precinct: 44 }).hint).toBe('Pinned')
  })

  it('names 105 and 116 together where the data merges them', () => {
    expect(hoverDetails(state, ds, { kind: 'precinct', precinct: 116 }).title).toBe('Precincts 105 & 116')
  })
})

describe('hoverDetails for a borough', () => {
  const details = hoverDetails(fire, ds, { kind: 'borough', borough: 'Queens' })
  const boroughs = (['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'] as const).map((b) =>
    areaValue(ds, fires, areaIdsIn(ds, b), y2025),
  )
  const own = areaValue(ds, fires, areaIdsIn(ds, 'Queens'), y2025)
  const city = areaValue(ds, fires, areaIdsIn(ds, null), y2025)

  it('names the borough and how many precincts it has', () => {
    expect(details.title).toBe('Queens')
    expect(details.subtitle).toBe('Borough · 17 precincts')
  })

  it('ranks it among the boroughs and gives its share of the city', () => {
    expect(details.ranks[0]).toEqual({ label: 'Among boroughs', rank: ordinal(rankOf(own, boroughs)), of: 'of 5' })
    expect(details.ranks[1]).toEqual({ label: 'Share of the city', rank: `${Math.round((own / city) * 100)}%`, of: 'of all fires' })
  })

  it('spans the five boroughs on its strip', () => {
    expect(details.strip.caption).toBe('Among the 5 boroughs')
    expect(details.strip.lo).toBe(formatCount(Math.min(...boroughs)))
    expect(details.strip.hi).toBe(formatCount(Math.max(...boroughs)))
  })

  it('has no borough average of its own', () => {
    expect(details.strip.boroughAverage).toBeNull()
    expect(details.comparisons).toHaveLength(1)
  })

  it('invites a click to focus', () => {
    expect(details.hint).toBe('Click to focus on Queens')
  })

  it('names its highest precinct instead of a share for density', () => {
    const density = hoverDetails(initialExplorerState, getDataset('demographic'), { kind: 'borough', borough: 'Queens' })
    expect(density.ranks[1].label).toBe('Highest precinct')
    expect(density.ranks[1].rank).toMatch(/^No\. \d+$/)
  })
})

describe('tooltipPosition', () => {
  const card = { width: 288, height: 240 }

  it('sits below and to the right of the pointer', () => {
    expect(tooltipPosition({ x: 100, y: 100 }, card, { width: 800, height: 600 })).toEqual({ left: 116, top: 112 })
  })

  it('flips left near the right edge and up near the bottom', () => {
    expect(tooltipPosition({ x: 700, y: 500 }, card, { width: 800, height: 600 })).toEqual({ left: 396, top: 248 })
  })

  it('keeps a card that fits nowhere whole at the top-left rather than cut off at the bottom', () => {
    const place = tooltipPosition({ x: 100, y: 100 }, { width: 288, height: 500 }, { width: 800, height: 400 })
    expect(place.top).toBe(8)
  })

  it('stays inside the map when flipping still leaves it hanging over the edge', () => {
    const place = tooltipPosition({ x: 300, y: 380 }, { width: 288, height: 330 }, { width: 800, height: 400 })
    expect(place.top + 330).toBeLessThanOrEqual(400)
    expect(place.top).toBeGreaterThanOrEqual(8)
  })

  it('never goes past the top or left edge', () => {
    expect(tooltipPosition({ x: 200, y: 150 }, card, { width: 300, height: 300 })).toEqual({ left: 8, top: 8 })
  })
})
