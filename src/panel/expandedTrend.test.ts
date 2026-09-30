import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { areaIdsIn } from '../data/places'
import { series } from '../data/selectors'
import { formatValue } from '../domain/format'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { getLayer } from '../layers'
import { lightTheme } from '../theme/tokens'
import { expandedTrend } from './expandedTrend'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const ds = getDataset('structural-fires')
const fires = getLayer('structural-fires')
const palette = { accent: lightTheme.story.fire.accent, ramp: lightTheme.story.fire.ramp, city: lightTheme.color.trendCity }
const y2025 = { from: 2025, to: 2025 } as const
const citySeries = series(ds, fires, areaIdsIn(ds, null), y2025)

describe('expandedTrend header', () => {
  it('names the story, layer, place, months and what it is compared with', () => {
    const t = expandedTrend({ ...fire, borough: 'Queens', pinnedPrecinct: 114 }, ds, palette, null)!
    expect(t.kicker).toBe('Fire · Monthly trend')
    expect(t.title).toBe('Structural fires · Precinct 114')
    expect(t.sub).toBe('Month by month, Jan 2025 to Dec 2025, against Queens and New York City')
  })

  it('does not mention a comparison for the city alone', () => {
    expect(expandedTrend(fire, ds, palette, null)!.sub).toBe('Month by month, Jan 2025 to Dec 2025')
  })

  it('has nothing to expand when there is no trend', () => {
    expect(expandedTrend(initialExplorerState, getDataset('population-density'), palette, null)).toBeNull()
  })
})

describe('expandedTrend stats', () => {
  it('totals the city, with its peak, low and change', () => {
    const t = expandedTrend(fire, ds, palette, null)!
    const peak = citySeries.indexOf(Math.max(...citySeries))
    const low = citySeries.indexOf(Math.min(...citySeries))
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    expect(t.stats).toEqual([
      { label: 'Total for the period', value: formatValue('count', citySeries.reduce((a, b) => a + b, 0)), note: 'fires' },
      { label: 'Peak month', value: `${months[peak]} 2025`, note: formatValue('count', citySeries[peak]) },
      { label: 'Lowest month', value: `${months[low]} 2025`, note: formatValue('count', citySeries[low]) },
      { label: 'First to last quarter', value: expect.stringMatching(/^[+−]\d+\.\d%$/), note: 'change across the period' },
    ])
  })

  it('compares a focused place with the city, per precinct', () => {
    const t = expandedTrend({ ...fire, borough: 'Queens' }, ds, palette, null)!
    expect(t.stats[0]).toMatchObject({ label: 'Monthly average', note: 'per precinct' })
    expect(t.stats[3]).toMatchObject({ label: 'Compared with New York City', note: 'per-precinct average' })
    expect(t.stats[3].value).toMatch(/^(Level|\d+% (higher|lower))$/)
  })
})

describe('expandedTrend readout', () => {
  it('reads out the last month until one is hovered', () => {
    const t = expandedTrend({ ...fire, borough: 'Queens' }, ds, palette, null)!
    expect(t.hovered).toBe(11)
    expect(t.readout.period).toBe('Dec 2025')
    expect(t.readout.values.map((r) => r.name)).toEqual(['Queens', 'New York City'])
  })

  it('reads out every line at the hovered month, focus first', () => {
    const t = expandedTrend(fire, ds, palette, 3)!
    expect(t.readout.period).toBe('Apr 2025')
    expect(t.readout.values).toEqual([{ name: 'New York City', colour: palette.accent, value: formatValue('count', citySeries[3]) }])
  })

  it('treats a hover beyond the data as the last month', () => {
    expect(expandedTrend(fire, ds, palette, 99)!.hovered).toBe(11)
  })

  it('marks the hovered month on the chart', () => {
    const t = expandedTrend(fire, ds, palette, 3)!
    expect(t.guideX).toBe(t.columns[3].x + t.columns[3].width / 2)
    expect(t.ticks.filter((k) => k.current).map((k) => k.text)).toEqual(['Apr'])
    for (const line of t.lines) expect(line.dots.filter((d) => d.highlight)).toHaveLength(1)
  })
})

describe('expandedTrend chart', () => {
  it('labels every month for one year, and quarters with years for a range', () => {
    expect(expandedTrend(fire, ds, palette, null)!.ticks.map((k) => k.text)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    expect(expandedTrend({ ...fire, yearFrom: 2024, yearTo: 2025 }, ds, palette, null)!.ticks.map((k) => k.text)).toEqual(['2024', 'Apr', 'Jul', 'Oct', '2025', 'Apr', 'Jul', 'Oct'])
  })

  it('draws five gridlines from the lowest value to the highest', () => {
    const t = expandedTrend(fire, ds, palette, null)!
    expect(t.grid).toHaveLength(5)
    expect(t.grid[0].y).toBeCloseTo(300)
    expect(t.grid[4].y).toBeCloseTo(28)
    expect(t.grid[0].text).toBe(formatValue('count', Math.min(...citySeries)))
  })

  it('covers the chart with one hover column per month, edge to edge', () => {
    const t = expandedTrend({ ...fire, yearFrom: 2019, yearTo: 2026 }, ds, palette, null)!
    expect(t.columns).toHaveLength(8 * 12 - 6)
    for (let i = 1; i < t.columns.length; i++) expect(t.columns[i].x).toBeCloseTo(t.columns[i - 1].x + t.columns[i - 1].width)
  })
})

describe('expandedTrend for yearly estimates', () => {
  const density = getDataset('population-density')
  const demo: ExplorerState = { ...initialExplorerState, yearFrom: 2021, yearTo: 2024 }

  it('speaks in years', () => {
    const t = expandedTrend(demo, density, { ...palette }, null)!
    expect(t.kicker).toBe('Demographic · Yearly trend')
    expect(t.sub).toBe('Year by year, 2021 to 2024')
    expect(t.stats.map((s) => s.label)).toEqual(['Average for the period', 'Peak year', 'Lowest year', expect.any(String)])
    expect(t.stats[0].note).toBe('people per sq mi')
    expect(t.readout.period).toBe('2024')
    expect(t.ticks.map((k) => k.text)).toEqual(['2021', '2022', '2023', '2024'])
  })
})
