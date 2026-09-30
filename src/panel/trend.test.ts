import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { areaIdsIn } from '../data/places'
import { series } from '../data/selectors'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { getLayer } from '../layers'
import { lightTheme } from '../theme/tokens'
import { trend } from './trend'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const ds = getDataset('structural-fires')
const palette = { accent: lightTheme.story.fire.accent, ramp: lightTheme.story.fire.ramp, city: lightTheme.color.trendCity }

describe('trend', () => {
  it('draws the city alone, in the story colour, month by month for the chosen year', () => {
    const t = trend(fire, ds, palette)
    expect(t.title).toBe('New York City')
    expect(t.period).toBe('Monthly · 2025')
    expect(t.lines).toHaveLength(1)
    expect(t.lines[0]).toMatchObject({ name: 'New York City', colour: palette.accent })
    expect(t.lines[0].points).toHaveLength(12)
    expect(t.key).toEqual([])
    expect(t.empty).toBeNull()
  })

  it('draws a focused borough in the story colour over a grey city line', () => {
    const t = trend({ ...fire, borough: 'Queens' }, ds, palette)
    expect(t.title).toBe('Queens')
    expect(t.lines.map((l) => [l.name, l.colour])).toEqual([
      ['New York City', palette.city],
      ['Queens', palette.accent],
    ])
    expect(t.key.map((k) => k.name)).toEqual(['Queens', 'New York City'])
  })

  it('draws a pinned precinct over its dimmed borough and the city', () => {
    const t = trend({ ...fire, borough: 'Queens', pinnedPrecinct: 116 }, ds, palette)
    expect(t.title).toBe('Precincts 105 & 116')
    expect(t.lines.map((l) => [l.name, l.colour])).toEqual([
      ['New York City', palette.city],
      ['Queens', palette.ramp[1]],
      ['Precincts 105 & 116', palette.accent],
    ])
  })

  it('compares counts per precinct when several places share the chart, and says so', () => {
    const t = trend({ ...fire, borough: 'Queens' }, ds, palette)
    expect(t.note).toBe('Average per precinct, so the lines compare fairly')
    const perPrecinct = series(ds, getLayer('structural-fires'), areaIdsIn(ds, 'Queens'), { from: 2025, to: 2025 }, true)
    expect(t.values[1]).toEqual(perPrecinct)
    expect(trend(fire, ds, palette).note).toBeNull()
  })

  it('shows only the chosen years', () => {
    const t = trend({ ...fire, yearFrom: 2022, yearTo: 2023 }, ds, palette)
    expect(t.lines[0].points).toHaveLength(24)
    expect(t.period).toBe('Monthly · 2022–2023')
  })

  it('puts a dot on every month for up to two years, and on each January beyond', () => {
    expect(trend({ ...fire, yearFrom: 2022, yearTo: 2023 }, ds, palette).lines[0].dots).toHaveLength(24)
    expect(trend({ ...fire, yearFrom: 2019, yearTo: 2025 }, ds, palette).lines[0].dots).toHaveLength(7)
  })

  it('labels months for a single year and years for a range', () => {
    expect(trend(fire, ds, palette).ticks.map((t) => t.text)).toEqual(['Jan', 'Apr', 'Jul', 'Oct', 'Dec'])
    expect(trend({ ...fire, yearFrom: 2023, yearTo: 2025 }, ds, palette).ticks.map((t) => t.text)).toEqual(['2023', '2024', '2025'])
  })

  it('gives the change from the first to the last quarter, with its sign', () => {
    expect(trend(fire, ds, palette).change).toMatch(/^[+−]\d+\.\d% first to last quarter$/)
  })

  it('keeps every point inside the chart', () => {
    for (const l of trend({ ...fire, borough: 'Bronx', pinnedPrecinct: 44, yearFrom: 2019, yearTo: 2026 }, ds, palette).lines) {
      for (const p of l.points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(296)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(80)
      }
    }
  })
})

describe('trend for yearly estimates', () => {
  const density = getDataset('population-density')

  it('plots one point per year', () => {
    const t = trend({ ...initialExplorerState, yearFrom: 2021, yearTo: 2024 }, density, palette)
    expect(t.period).toBe('Yearly estimates · 2021–2024')
    expect(t.lines[0].points).toHaveLength(4)
    expect(t.lines[0].dots).toHaveLength(4)
    expect(t.ticks.map((k) => k.text)).toEqual(['2021', '2022', '2023', '2024'])
    expect(t.change).toMatch(/^[+−]\d+\.\d% since 2021$/)
    expect(t.note).toBeNull()
  })

  it('asks for a wider range when the years hold a single estimate', () => {
    const t = trend(initialExplorerState, density, palette)
    expect(t.empty).toBe('Only one yearly estimate in these years. Choose a wider range to see a trend.')
    expect(t.lines).toEqual([])
  })
})
