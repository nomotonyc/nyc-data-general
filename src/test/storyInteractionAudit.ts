import { describe, expect, it, vi } from 'vitest'
import { getDataset } from '../data/load'
import { breakdown } from '../panel/breakdown'
import { focusSummary, boroughBars, topAreas } from '../panel/focus'
import { trend } from '../panel/trend'
import { expandedTrend } from '../panel/expandedTrend'
import { shownSources } from '../panel/sources'
import { pictureCaption } from '../panel/caption'
import { BOROUGHS, GEOGRAPHIES, areasOf, type Geography } from '../domain/geography'
import { YEARS, type StoryId, type Year } from '../domain/stories'
import { explorerReducer, initialExplorerState, type ExplorerAction, type ExplorerState } from '../explorer/state'
import { choropleth } from '../map/choropleth'
import { legendDetails } from '../map/legend'
import { paintMap } from '../map/paint'
import { layersOf } from '../layers'
import { lightTheme } from '../theme/tokens'

const paletteOf = (story: StoryId) => ({
  accent: lightTheme.story[story].accent,
  ramp: lightTheme.story[story].ramp,
  city: lightTheme.color.trendCity,
})

function starting(story: StoryId, metricId: string, geography: Geography): ExplorerState {
  return { ...initialExplorerState, storyId: story, metricId, geography }
}

/** Read every derived view and send the plan through map painting after a state transition. */
function inspect(state: ExplorerState) {
  const ds = getDataset(state.metricId, state.geography)
  const palette = paletteOf(state.storyId)
  const plan = choropleth(state, ds, palette.ramp)
  const legend = legendDetails(plan, layersOf(state.storyId).find((l) => l.id === state.metricId)!, palette.ramp,
    { from: state.yearFrom, to: state.yearTo }, { from: ds.periods[0].year, to: ds.periods.at(-1)!.year }, ds.placement)
  const focus = focusSummary(state, ds)
  const bars = boroughBars(state, ds, palette.ramp, lightTheme.color.lineStrong)
  const chart = trend(state, ds, palette)
  const expanded = expandedTrend(state, ds, palette, null)
  const parts = breakdown(state, ds, { ramp: palette.ramp, greys: [lightTheme.color.inkFaint, lightTheme.color.lineStrong] })
  const top = topAreas(state, ds)
  const sources = shownSources(state)
  const caption = pictureCaption('view', state, ds)
  const map = { setFeatureState: vi.fn(), setLayoutProperty: vi.fn(), setPaintProperty: vi.fn(), setFilter: vi.fn() }
  paintMap(map, plan, {
    outlines: state.showOutlines, labels: state.showLabels, hospitals: state.showHospitals,
    emsStations: state.showEmsStations, firehouses: state.showFirehouses,
    hydrants: state.showHydrants,
    pinned: state.pinnedArea ? [areasOf(state.geography).find((a) => a.id === state.pinnedArea)!.number] : [],
  })

  expect(plan.geography).toBe(state.geography)
  expect(Number.isFinite(plan.lo) && Number.isFinite(plan.hi)).toBe(true)
  expect(plan.lo).toBeLessThanOrEqual(plan.hi)
  expect(legend.title).toContain(layersOf(state.storyId).find((l) => l.id === state.metricId)!.label)
  expect(focus.value).not.toMatch(/NaN|Infinity/)
  expect(focus.name).toBe(state.pinnedArea ? areasOf(state.geography).find((a) => a.id === state.pinnedArea)!.label : state.borough ?? 'New York City')
  expect(bars).toHaveLength(5)
  expect(top.length).toBeGreaterThan(0)
  expect(parts.parts.length).toBeGreaterThan(0)
  expect(parts.parts.every((p) => Number.isFinite(p.width) && p.width >= 0 && p.width <= 100)).toBe(true)
  expect(chart.empty === null).toBe(expanded !== null)
  expect(chart.lines.every((line) => line.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))).toBe(true)
  expect(sources.sources.length).toBeGreaterThan(0)
  expect(caption.title).toContain(layersOf(state.storyId).find((l) => l.id === state.metricId)!.label)
  expect(map.setFilter).toHaveBeenCalled()
  if (state.pinnedArea) expect(state.borough).toBe(areasOf(state.geography).find((a) => a.id === state.pinnedArea)!.borough)
}

function move(state: ExplorerState, action: ExplorerAction): ExplorerState {
  const next = explorerReducer(state, action)
  inspect(next)
  return next
}

/** Every selectable target within one story, including reversals and marker combinations. */
export function auditStory(story: StoryId) {
  const metrics = layersOf(story)

  describe(`${story} interactions`, () => {
    describe('layers, areas and focus', () => {
      for (const layer of metrics) for (const geography of GEOGRAPHIES) {
        it(`${layer.id}: ${geography} through city, borough and pinned area`, () => {
          let state = starting(story, layer.id, geography)
          inspect(state)
          state = move(state, { type: 'setDetail', detail: 'area' })
          state = move(state, { type: 'setDetail', detail: 'borough' })
          for (const borough of BOROUGHS) {
            state = move(state, { type: 'focusBorough', borough })
            const first = areasOf(geography).find((a) => a.borough === borough)!
            state = move(state, { type: 'pinArea', id: first.id })
            state = move(state, { type: 'unpinArea' })
          }
          state = move(state, { type: 'resetCityView' })
          expect(state.borough).toBeNull()
          expect(state.pinnedArea).toBeNull()
        })
      }
    })

    describe('every area-to-area transition', () => {
      for (const layer of metrics) {
        it(`${layer.id}: city and focused transitions`, () => {
          for (const focused of [false, true]) {
            let state = starting(story, layer.id, 'battalions')
            if (focused) state = move(state, { type: 'focusBorough', borough: 'Queens' })
            for (const from of GEOGRAPHIES) for (const to of GEOGRAPHIES) {
              state = move(state, { type: 'setGeography', geography: from })
              const area = areasOf(from).find((a) => a.borough === 'Queens')!
              state = move(state, { type: 'pinArea', id: area.id })
              state = move(state, { type: 'setGeography', geography: to })
              expect(state.geography).toBe(to)
              if (from !== to) expect(state.pinnedArea).toBeNull()
              state = move(state, { type: 'resetCityView' })
              if (focused) state = move(state, { type: 'focusBorough', borough: 'Queens' })
            }
          }
        })
      }
    })

    describe('every layer-to-layer transition', () => {
      for (const geography of GEOGRAPHIES) {
        it(`${geography}: city, borough and pinned context`, () => {
          for (const context of ['city', 'borough', 'pinned'] as const) {
            for (const from of metrics) for (const to of metrics) {
              let state = starting(story, from.id, geography)
              if (context !== 'city') state = move(state, { type: 'focusBorough', borough: 'Bronx' })
              if (context === 'pinned') state = move(state, { type: 'pinArea', id: areasOf(geography).find((a) => a.borough === 'Bronx')!.id })
              state = move(state, { type: 'selectMetric', metricId: to.id })
              expect(state.metricId).toBe(to.id)
            }
          }
        })
      }
    })

    describe('years and map controls', () => {
      for (const layer of metrics) for (const geography of GEOGRAPHIES) {
        it(`${layer.id}: ${geography} year choices and toggle pairs`, () => {
          let state = starting(story, layer.id, geography)
          const years: Year[] = [...YEARS]
          for (const from of years) for (const to of years.filter((year) => year >= from)) {
            state = move(state, { type: 'setYearFrom', year: from })
            state = move(state, { type: 'setYearTo', year: to })
            expect(state.yearFrom).toBe(from)
            expect(state.yearTo).toBe(to)
          }
          const toggles: ExplorerAction['type'][] = ['toggleOutlines', 'toggleLabels', 'toggleHospitals', 'toggleEmsStations', 'toggleFirehouses']
          for (const first of toggles) for (const second of toggles) {
            state = move(state, { type: first } as ExplorerAction)
            state = move(state, { type: second } as ExplorerAction)
          }
        })
      }
    })

    describe('pairwise control changes', () => {
      const actions: { name: string; make: (state: ExplorerState) => ExplorerAction }[] = [
        ...metrics.map((metric) => ({ name: `layer ${metric.id}`, make: () => ({ type: 'selectMetric', metricId: metric.id } as const) })),
        ...GEOGRAPHIES.map((geography) => ({ name: `area ${geography}`, make: () => ({ type: 'setGeography', geography } as const) })),
        ...BOROUGHS.map((borough) => ({ name: `focus ${borough}`, make: () => ({ type: 'focusBorough', borough } as const) })),
        { name: 'focus city', make: () => ({ type: 'focusBorough', borough: null }) },
        { name: 'pin', make: (state) => ({ type: 'pinArea', id: areasOf(state.geography).find((area) => area.borough === (state.borough ?? 'Queens'))!.id }) },
        { name: 'unpin', make: () => ({ type: 'unpinArea' }) },
        { name: 'reset city', make: () => ({ type: 'resetCityView' }) },
        { name: 'borough detail', make: () => ({ type: 'setDetail', detail: 'borough' }) },
        { name: 'area detail', make: () => ({ type: 'setDetail', detail: 'area' }) },
        ...(['toggleOutlines', 'toggleLabels', 'toggleHospitals', 'toggleEmsStations', 'toggleFirehouses'] as const).map((type) => ({ name: type, make: () => ({ type }) })),
        ...([2019, 2021, 2024, 2026] as const).map((year) => ({ name: `from ${year}`, make: () => ({ type: 'setYearFrom', year } as const) })),
        ...([2019, 2021, 2024, 2026] as const).map((year) => ({ name: `to ${year}`, make: () => ({ type: 'setYearTo', year } as const) })),
        { name: 'open trend', make: () => ({ type: 'openTrend' }) },
        { name: 'close trend', make: () => ({ type: 'closeTrend' }) },
      ]
      for (const layer of metrics) {
        it(`${layer.id}: every control followed by every other control`, () => {
          for (const first of actions) for (const second of actions) {
            try {
              let state = starting(story, layer.id, 'battalions')
              state = move(state, first.make(state))
              state = move(state, second.make(state))
              expect(state.storyId).toBe(story)
            } catch (error) {
              throw new Error(`${story}/${layer.id}: ${first.name} → ${second.name}: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
        })
      }
    })
  })
}
