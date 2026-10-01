import { getLayer } from '../layers'
import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { BOROUGHS, precinctsIn } from '../domain/geography'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { lightTheme } from '../theme/tokens'
import { areaValue } from '../data/selectors'
import { choropleth } from './choropleth'
import { equalIntervalScale } from './colorScale'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const fireRamp = lightTheme.story.fire.ramp
const density = initialExplorerState
const densityRamp = lightTheme.story.demographic.ramp

describe('choropleth', () => {
  it('colours the five boroughs at borough level, using the story’s ramp', () => {
    const plan = choropleth(fire, getDataset('structural-fires'), fireRamp)
    expect(plan.level).toBe('borough')
    expect(Object.keys(plan.boroughs).sort()).toEqual([...BOROUGHS].sort())
    const colours = Object.values(plan.boroughs)
    expect(colours).toContain(fireRamp[0])
    expect(colours).toContain(fireRamp[4])
  })

  it('colours every precinct at precinct level', () => {
    const plan = choropleth({ ...fire, detail: 'precinct' }, getDataset('structural-fires'), fireRamp)
    expect(plan.level).toBe('precinct')
    expect(Object.keys(plan.precincts)).toHaveLength(78)
  })

  it('always colours both boroughs and precincts, so a fade between levels goes colour to colour, never through white', () => {
    for (const s of [fire, { ...fire, detail: 'precinct' as const }, { ...fire, borough: 'Queens' as const }]) {
      const plan = choropleth(s, getDataset('structural-fires'), fireRamp)
      expect(Object.keys(plan.boroughs), JSON.stringify(s)).toHaveLength(5)
      expect(Object.keys(plan.precincts).length, JSON.stringify(s)).toBeGreaterThan(0)
    }
    expect(Object.keys(choropleth(fire, getDataset('structural-fires'), fireRamp).precincts)).toHaveLength(78)
  })

  it('colours 105 and 116 each from its own value', () => {
    const ds = getDataset('population-density')
    const plan = choropleth({ ...density, detail: 'precinct', yearFrom: 2024, yearTo: 2024 }, ds, densityRamp)
    const people = getLayer('population-density')
    const range = { from: 2024, to: 2024 } as const
    const scale = equalIntervalScale(ds.areas.map((a) => areaValue(ds, people, [a.id], range)), densityRamp)
    expect(ds.areas.map((a) => a.id)).toEqual(expect.arrayContaining(['105', '116']))
    expect(plan.precincts[105]).toBe(scale(areaValue(ds, people, ['105'], range)))
    expect(plan.precincts[116]).toBe(scale(areaValue(ds, people, ['116'], range)))
  })

  it('scales a focused borough’s precincts to that borough', () => {
    const plan = choropleth({ ...fire, borough: 'Queens' }, getDataset('structural-fires'), fireRamp)
    expect(plan.level).toBe('precinct')
    const queens = precinctsIn('Queens').map((p) => plan.precincts[p])
    expect(queens).toContain(fireRamp[0])
    expect(queens).toContain(fireRamp[4])
  })

  it('keeps city-wide colours on the precincts outside the focus, so they fade out without flashing', () => {
    const city = choropleth({ ...fire, detail: 'precinct' }, getDataset('structural-fires'), fireRamp)
    const queens = choropleth({ ...fire, borough: 'Queens' }, getDataset('structural-fires'), fireRamp)
    expect(Object.keys(queens.precincts)).toHaveLength(78)
    for (const p of precinctsIn('Brooklyn')) expect(queens.precincts[p], `precinct ${p}`).toBe(city.precincts[p])
  })

  it('names the focused borough, or none for the whole city', () => {
    expect(choropleth(fire, getDataset('structural-fires'), fireRamp).focus).toBeNull()
    expect(choropleth({ ...fire, borough: 'Queens' }, getDataset('structural-fires'), fireRamp).focus).toBe('Queens')
  })

  it('reports the value range shown, for the legend', () => {
    const plan = choropleth(fire, getDataset('structural-fires'), fireRamp)
    expect(plan.lo).toBeLessThan(plan.hi)
  })

  it('colours density by the nearest available year and says so', () => {
    const plan = choropleth(density, getDataset('population-density'), densityRamp)
    expect(plan.range).toEqual({ from: 2024, to: 2024 })
    expect(plan.adjusted).toBe(true)
  })
})
