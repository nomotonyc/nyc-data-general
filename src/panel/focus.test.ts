import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { areaIdsIn } from '../data/places'
import { areaValue } from '../data/selectors'
import { formatValue } from '../domain/format'
import { BOROUGHS } from '../domain/geography'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { getLayer } from '../layers'
import { lightTheme } from '../theme/tokens'
import { boroughBars, focusSummary, topAreas } from './focus'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const ds = getDataset('structural-fires')
const fires = getLayer('structural-fires')
const y2025 = { from: 2025, to: 2025 } as const
const boroughValue = (b: (typeof BOROUGHS)[number]) => areaValue(ds, fires, areaIdsIn(ds, b), y2025)

describe('focusSummary', () => {
  it('describes the whole city', () => {
    const s = focusSummary(fire, ds)
    expect(s.name).toBe('New York City')
    expect(s.context).toBe('All five boroughs · 78 precincts')
    expect(s.value).toBe(formatValue('count', areaValue(ds, fires, areaIdsIn(ds, null), y2025)))
    expect(s.unit).toBe('fires')
    const highest = [...BOROUGHS].sort((a, b) => boroughValue(b) - boroughValue(a))[0]
    expect(s.comparison).toBe(`Highest: ${highest}`)
    expect(s.tone).toBe('neutral')
  })

  it('says exactly what the number counts, and for which years', () => {
    expect(focusSummary(fire, ds).measure).toBe('Incidents FDNY was dispatched to and classified as structural fires · 2025')
    expect(focusSummary({ ...fire, yearFrom: 2022, yearTo: 2026 }, ds).measure).toMatch(/ · 2022–2026 \(Jan–Jun\)$/)
  })

  it('names the year density actually uses', () => {
    expect(focusSummary(initialExplorerState, getDataset('population-density')).measure).toBe(
      'Residents per square mile of land, from Census Bureau estimates · 2024',
    )
  })

  it('ranks a focused borough and compares it with the average borough', () => {
    const s = focusSummary({ ...fire, borough: 'Queens' }, ds)
    expect(s.name).toBe('Queens')
    expect(s.context).toMatch(/^(Highest|\d+(st|nd|rd|th) highest) of 5 boroughs · 17 precincts$/)
    expect(s.comparison).toMatch(/^([+−]\d+% vs\. |Level with )the average borough$/)
  })

  it('calls the top borough the highest rather than 1st highest', () => {
    const top = [...BOROUGHS].sort((a, b) => boroughValue(b) - boroughValue(a))[0]
    expect(focusSummary({ ...fire, borough: top }, ds).context).toMatch(/^Highest of 5 boroughs · /)
  })

  it('ranks a pinned precinct in its borough and citywide', () => {
    const s = focusSummary({ ...fire, borough: 'Bronx', pinnedPrecinct: 44 }, ds)
    expect(s.name).toBe('Precinct 44')
    expect(s.context).toMatch(/^Bronx · \d+(st|nd|rd|th) of 12 in the Bronx · \d+(st|nd|rd|th) of 78 citywide$/)
    expect(s.comparison).toMatch(/^([+−]\d+% vs\. |Level with )the citywide precinct average$/)
  })

  it('names precinct 116 on its own', () => {
    expect(focusSummary({ ...fire, borough: 'Queens', pinnedPrecinct: 116 }, ds).name).toBe('Precinct 116')
  })

  it('marks above-average places in the story colour and below-average ones neutral', () => {
    const summaries = BOROUGHS.map((b) => focusSummary({ ...fire, borough: b }, ds))
    const above = summaries.find((s) => s.comparison.startsWith('+'))!
    const below = summaries.find((s) => s.comparison.startsWith('−'))!
    expect(above.tone).toBe('accent')
    expect(below.tone).toBe('neutral')
  })

  it('uses the nearest available year for density', () => {
    const density = getDataset('population-density')
    const s = focusSummary(initialExplorerState, density)
    const people = getLayer('population-density')
    expect(s.value).toBe(formatValue('count', areaValue(density, people, areaIdsIn(density, null), { from: 2024, to: 2024 })))
  })
})

describe('boroughBars', () => {
  const ramp = lightTheme.story.fire.ramp

  it('gives the five boroughs a bar in proportion to the largest', () => {
    const bars = boroughBars(fire, ds, ramp, lightTheme.color.lineStrong)
    expect(bars.map((b) => b.borough)).toEqual([...BOROUGHS])
    expect(Math.max(...bars.map((b) => b.width))).toBe(100)
    for (const b of bars) expect(b.value).toBe(formatValue('count', boroughValue(b.borough)))
  })

  it('highlights a focused borough and greys the rest', () => {
    const bars = boroughBars({ ...fire, borough: 'Queens' }, ds, ramp, lightTheme.color.lineStrong)
    expect(bars.find((b) => b.borough === 'Queens')).toMatchObject({ colour: ramp[3], current: true })
    expect(bars.find((b) => b.borough === 'Bronx')).toMatchObject({ colour: lightTheme.color.lineStrong, current: false })
  })
})

describe('topAreas', () => {
  it('lists the five highest areas in the city, highest first', () => {
    const top = topAreas(fire, ds)
    expect(top).toHaveLength(5)
    const values = top.map((t) => areaValue(ds, fires, [t.id], y2025))
    expect([...values].sort((a, b) => b - a)).toEqual(values)
    expect(top[0].rank).toBe(1)
  })

  it('lists only the focused borough’s areas', () => {
    for (const t of topAreas({ ...fire, borough: 'Queens' }, ds)) expect(t.borough).toBe('Queens')
  })

  it('carries what to pin, and marks the pinned one', () => {
    const [first] = topAreas(fire, ds)
    const pinned = topAreas({ ...fire, borough: first.borough, pinnedPrecinct: first.precinct }, ds)
    expect(pinned.find((t) => t.id === first.id)?.pinned).toBe(true)
  })
})
