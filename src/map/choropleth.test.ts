import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { BOROUGHS, precinctsIn } from '../domain/geography'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { lightTheme } from '../theme/tokens'
import { choropleth } from './choropleth'

const fire: ExplorerState = { ...initialExplorerState, storyId: 'fire', metricId: 'structural-fires' }
const fireRamp = lightTheme.story.fire.ramp
const density = initialExplorerState
const densityRamp = lightTheme.story.demographic.ramp

describe('choropleth', () => {
  it('colours the five boroughs at borough level, using the story’s ramp', () => {
    const plan = choropleth(fire, getDataset('fire'), fireRamp)
    expect(plan.level).toBe('borough')
    expect(Object.keys(plan.boroughs).sort()).toEqual([...BOROUGHS].sort())
    expect(plan.precincts).toEqual({})
    const colours = Object.values(plan.boroughs)
    expect(colours).toContain(fireRamp[0])
    expect(colours).toContain(fireRamp[4])
  })

  it('colours every precinct at precinct level, both halves of 105 & 116 alike', () => {
    const plan = choropleth({ ...fire, detail: 'precinct' }, getDataset('fire'), fireRamp)
    expect(plan.level).toBe('precinct')
    expect(Object.keys(plan.precincts)).toHaveLength(78)
    expect(plan.precincts[105]).toBe(plan.precincts[116])
    expect(plan.boroughs).toEqual({})
  })

  it('keeps 105 and 116 separate where the data does', () => {
    const plan = choropleth({ ...density, detail: 'precinct', yearFrom: 2024, yearTo: 2024 }, getDataset('demographic'), densityRamp)
    expect(Object.keys(plan.precincts)).toHaveLength(78)
  })

  it('colours only the focused borough’s precincts, scaled to that borough', () => {
    const plan = choropleth({ ...fire, borough: 'Queens' }, getDataset('fire'), fireRamp)
    expect(plan.level).toBe('precinct')
    expect(Object.keys(plan.precincts).map(Number).sort((a, b) => a - b)).toEqual(precinctsIn('Queens'))
    const colours = Object.values(plan.precincts)
    expect(colours).toContain(fireRamp[0])
    expect(colours).toContain(fireRamp[4])
  })

  it('names the focused borough, or none for the whole city', () => {
    expect(choropleth(fire, getDataset('fire'), fireRamp).focus).toBeNull()
    expect(choropleth({ ...fire, borough: 'Queens' }, getDataset('fire'), fireRamp).focus).toBe('Queens')
  })

  it('reports the value range shown, for the legend', () => {
    const plan = choropleth(fire, getDataset('fire'), fireRamp)
    expect(plan.lo).toBeLessThan(plan.hi)
  })

  it('colours density by the nearest available year and says so', () => {
    const plan = choropleth(density, getDataset('demographic'), densityRamp)
    expect(plan.range).toEqual({ from: 2024, to: 2024 })
    expect(plan.adjusted).toBe(true)
  })
})
