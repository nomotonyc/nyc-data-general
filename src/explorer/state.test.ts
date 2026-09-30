import { describe, expect, it } from 'vitest'
import {
  effectiveDetail,
  explorerReducer as reduce,
  initialExplorerState as initial,
  yearToOptions,
  type ExplorerState,
} from './state'

const at = (patch: Partial<ExplorerState>): ExplorerState => ({ ...initial, ...patch })

describe('initial state', () => {
  it('opens on the first story and layer, the whole city, the latest full year', () => {
    expect(initial).toEqual({
      storyId: 'demographic',
      metricId: 'population-density',
      borough: null,
      pinnedPrecinct: null,
      detail: 'borough',
      showOutlines: true,
      showLabels: true,
      yearFrom: 2025,
      yearTo: 2025,
      trendOpen: false,
    })
  })
})

describe('selectStory', () => {
  it('switches story and resets the layer to its first', () => {
    const s = reduce(initial, { type: 'selectStory', storyId: 'fire' })
    expect(s.storyId).toBe('fire')
    expect(s.metricId).toBe('structural-fires')
  })

  it('keeps the place, pin and years', () => {
    const before = at({ borough: 'Bronx', pinnedPrecinct: 44, yearFrom: 2021, yearTo: 2023 })
    const s = reduce(before, { type: 'selectStory', storyId: 'medical' })
    expect(s).toMatchObject({ borough: 'Bronx', pinnedPrecinct: 44, yearFrom: 2021, yearTo: 2023 })
  })

  it('changes nothing when the story is already selected', () => {
    expect(reduce(initial, { type: 'selectStory', storyId: 'demographic' })).toBe(initial)
  })
})

describe('selectMetric', () => {
  it('accepts a layer of the current story', () => {
    const fire = reduce(initial, { type: 'selectStory', storyId: 'fire' })
    expect(reduce(fire, { type: 'selectMetric', metricId: 'structural-fires' }).metricId).toBe('structural-fires')
  })

  it('ignores a layer from another story', () => {
    expect(reduce(initial, { type: 'selectMetric', metricId: 'ems-calls' })).toBe(initial)
  })
})

describe('focusBorough', () => {
  it('focuses a borough and clears any pin', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedPrecinct: 44 }), { type: 'focusBorough', borough: 'Queens' })
    expect(s).toMatchObject({ borough: 'Queens', pinnedPrecinct: null })
  })

  it('returns to the whole city with null', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedPrecinct: 44 }), { type: 'focusBorough', borough: null })
    expect(s).toMatchObject({ borough: null, pinnedPrecinct: null })
  })
})

describe('pinPrecinct', () => {
  it('pins the precinct and focuses its borough from the city view', () => {
    const s = reduce(initial, { type: 'pinPrecinct', precinct: 14 })
    expect(s).toMatchObject({ borough: 'Manhattan', pinnedPrecinct: 14 })
  })

  it('moves focus when the precinct is in another borough', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedPrecinct: 44 }), { type: 'pinPrecinct', precinct: 75 })
    expect(s).toMatchObject({ borough: 'Brooklyn', pinnedPrecinct: 75 })
  })

  it('ignores numbers that are not precincts', () => {
    expect(reduce(initial, { type: 'pinPrecinct', precinct: 2 })).toBe(initial)
  })

  it('unpins back to the borough', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedPrecinct: 44 }), { type: 'unpinPrecinct' })
    expect(s).toMatchObject({ borough: 'Bronx', pinnedPrecinct: null })
  })
})

describe('detail and map toggles', () => {
  it('sets detail', () => {
    expect(reduce(initial, { type: 'setDetail', detail: 'precinct' }).detail).toBe('precinct')
  })

  it('always shows precincts when a borough is focused', () => {
    expect(effectiveDetail(at({ detail: 'borough' }))).toBe('borough')
    expect(effectiveDetail(at({ detail: 'borough', borough: 'Queens' }))).toBe('precinct')
  })

  it('flips outlines and labels', () => {
    expect(reduce(initial, { type: 'toggleOutlines' }).showOutlines).toBe(false)
    expect(reduce(initial, { type: 'toggleLabels' }).showLabels).toBe(false)
  })
})

describe('year range', () => {
  it('moves To up when From passes it', () => {
    const s = reduce(at({ yearFrom: 2020, yearTo: 2021 }), { type: 'setYearFrom', year: 2023 })
    expect(s).toMatchObject({ yearFrom: 2023, yearTo: 2023 })
  })

  it('keeps To when From moves earlier', () => {
    const s = reduce(at({ yearFrom: 2025, yearTo: 2025 }), { type: 'setYearFrom', year: 2021 })
    expect(s).toMatchObject({ yearFrom: 2021, yearTo: 2025 })
  })

  it('never lets To precede From', () => {
    const before = at({ yearFrom: 2024, yearTo: 2024 })
    expect(reduce(before, { type: 'setYearTo', year: 2021 })).toBe(before)
  })

  it('accepts To equal to From for a single year', () => {
    const s = reduce(at({ yearFrom: 2022, yearTo: 2024 }), { type: 'setYearTo', year: 2022 })
    expect(s).toMatchObject({ yearFrom: 2022, yearTo: 2022 })
  })

  it('reaches the partial final year', () => {
    expect(reduce(initial, { type: 'setYearTo', year: 2026 }).yearTo).toBe(2026)
  })

  it('ignores years outside 2019–2026', () => {
    expect(reduce(initial, { type: 'setYearFrom', year: 2018 })).toBe(initial)
    expect(reduce(initial, { type: 'setYearTo', year: 2027 })).toBe(initial)
  })

  it('offers only To years from From onward', () => {
    expect(yearToOptions(at({ yearFrom: 2022, yearTo: 2023 }))).toEqual([2022, 2023, 2024, 2025, 2026])
  })
})

describe('trend dialog', () => {
  it('opens and closes', () => {
    const open = reduce(initial, { type: 'openTrend' })
    expect(open.trendOpen).toBe(true)
    expect(reduce(open, { type: 'closeTrend' }).trendOpen).toBe(false)
  })
})
