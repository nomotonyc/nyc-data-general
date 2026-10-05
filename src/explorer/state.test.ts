import { describe, expect, it } from 'vitest'
import {
  activeMetric,
  effectiveDetail,
  explorerReducer as reduce,
  initialExplorerState as initial,
  yearToOptions,
  type ExplorerState,
} from './state'

// Precinct view unless a test says otherwise: the app opens on battalions.
const at = (patch: Partial<ExplorerState>): ExplorerState => ({ ...initial, geography: 'precincts', ...patch })

describe('initial state', () => {
  it('opens on the first story and layer, the whole city, the latest full year', () => {
    expect(initial).toEqual({
      storyId: 'demographic',
      metricId: 'population-density',
      borough: null,
      pinnedArea: null,
      geography: 'battalions',
      detail: 'borough',
      showOutlines: true,
      showLabels: true,
      showFirehouses: false,
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
    const before = at({ borough: 'Bronx', pinnedArea: '44', yearFrom: 2021, yearTo: 2023 })
    const s = reduce(before, { type: 'selectStory', storyId: 'medical' })
    expect(s).toMatchObject({ borough: 'Bronx', pinnedArea: '44', yearFrom: 2021, yearTo: 2023 })
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
    expect(reduce(initial, { type: 'selectMetric', metricId: 'ambulance-calls' })).toBe(initial)
  })
})

describe('focusBorough', () => {
  it('focuses a borough and clears any pin', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedArea: '44' }), { type: 'focusBorough', borough: 'Queens' })
    expect(s).toMatchObject({ borough: 'Queens', pinnedArea: null })
  })

  it('returns to the whole city with null', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedArea: '44' }), { type: 'focusBorough', borough: null })
    expect(s).toMatchObject({ borough: null, pinnedArea: null })
  })
})

describe('pinArea', () => {
  it('zooms into the borough of a precinct pinned from the city view', () => {
    const s = reduce(at({ detail: 'area' }), { type: 'pinArea', id: '14' })
    expect(s).toMatchObject({ borough: 'Manhattan', pinnedArea: '14' })
  })

  it('keeps a pin inside a focused borough when Detail changes', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedArea: '44' }), { type: 'setDetail', detail: 'borough' })
    expect(s.pinnedArea).toBe('44')
  })

  it('moves focus when the precinct is in another borough', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedArea: '44' }), { type: 'pinArea', id: '75' })
    expect(s).toMatchObject({ borough: 'Brooklyn', pinnedArea: '75' })
  })

  it('ignores ids that are not areas of the current geography', () => {
    const precincts = at({})
    expect(reduce(precincts, { type: 'pinArea', id: '2' })).toBe(precincts)
    expect(reduce(precincts, { type: 'pinArea', id: 'bn14' })).toBe(precincts)
    expect(reduce(initial, { type: 'pinArea', id: '44' })).toBe(initial)
  })

  it('unpins back to the borough', () => {
    const s = reduce(at({ borough: 'Bronx', pinnedArea: '44' }), { type: 'unpinArea' })
    expect(s).toMatchObject({ borough: 'Bronx', pinnedArea: null })
  })
})

describe('detail and map toggles', () => {
  it('sets detail', () => {
    expect(reduce(initial, { type: 'setDetail', detail: 'area' }).detail).toBe('area')
  })

  it('always shows precincts when a borough is focused', () => {
    expect(effectiveDetail(at({ detail: 'borough' }))).toBe('borough')
    expect(effectiveDetail(at({ detail: 'borough', borough: 'Queens' }))).toBe('area')
  })

  it('flips outlines and labels', () => {
    expect(reduce(initial, { type: 'toggleOutlines' }).showOutlines).toBe(false)
    expect(reduce(initial, { type: 'toggleLabels' }).showLabels).toBe(false)
  })

  it('shows firehouses when asked, and keeps them shown in every story', () => {
    const shown = reduce(initial, { type: 'toggleFirehouses' })
    expect(shown.showFirehouses).toBe(true)
    expect(reduce(shown, { type: 'selectStory', storyId: 'medical' }).showFirehouses).toBe(true)
    expect(reduce(shown, { type: 'toggleFirehouses' }).showFirehouses).toBe(false)
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

describe('activeMetric', () => {
  it('returns the selected layer of the current story', () => {
    expect(activeMetric(initial).label).toBe('Population density')
    expect(activeMetric(reduce(initial, { type: 'selectStory', storyId: 'medical' })).label).toBe('Ambulance calls')
  })
})

describe('geography', () => {
  const fires = at({ storyId: 'fire', metricId: 'fire-apparatus-accidents' })

  it('switches to battalions for a layer that has them, keeping the borough and clearing the pin', () => {
    const s = reduce({ ...fires, borough: 'Bronx', pinnedArea: '44' }, { type: 'setGeography', geography: 'battalions' })
    expect(s).toMatchObject({ geography: 'battalions', borough: 'Bronx', pinnedArea: null })
  })

  it('pins battalions by their own ids once switched', () => {
    const s = reduce(reduce(fires, { type: 'setGeography', geography: 'battalions' }), { type: 'pinArea', id: 'bn14' })
    expect(s).toMatchObject({ borough: 'Bronx', pinnedArea: 'bn14' })
  })

  // A layer without battalions is covered in state.geography.test.ts, with a fixture layer.
  it('stays in battalions across layers that have them', () => {
    const s = reduce(reduce(fires, { type: 'setGeography', geography: 'battalions' }), { type: 'selectStory', storyId: 'demographic' })
    expect(s.geography).toBe('battalions')
  })
})
