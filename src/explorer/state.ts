import { boroughOfPrecinct, isPrecinct, type Borough } from '../domain/geography'
import { STORIES, YEARS, findMetric, getStory, isYear, type Metric, type StoryId, type Year } from '../domain/stories'

export type Detail = 'borough' | 'precinct'

export type ExplorerState = {
  storyId: StoryId
  metricId: string
  /** Focused borough; null is the whole city. */
  borough: Borough | null
  /** Inside `borough` when one is focused; at city level it can be any precinct. */
  pinnedPrecinct: number | null
  /** Map level at city scale. A focused borough always shows precincts. */
  detail: Detail
  showOutlines: boolean
  showLabels: boolean
  /** Inclusive; yearTo >= yearFrom. */
  yearFrom: Year
  yearTo: Year
  trendOpen: boolean
}

/** The last complete year; the final year in YEARS is partial. */
const LATEST_FULL_YEAR = YEARS[YEARS.length - 2]

export const initialExplorerState: ExplorerState = {
  storyId: STORIES[0].id,
  metricId: STORIES[0].metrics[0].id,
  borough: null,
  pinnedPrecinct: null,
  detail: 'borough',
  showOutlines: true,
  showLabels: true,
  yearFrom: LATEST_FULL_YEAR,
  yearTo: LATEST_FULL_YEAR,
  trendOpen: false,
}

export type ExplorerAction =
  | { type: 'selectStory'; storyId: StoryId }
  | { type: 'selectMetric'; metricId: string }
  | { type: 'focusBorough'; borough: Borough | null }
  | { type: 'pinPrecinct'; precinct: number }
  | { type: 'unpinPrecinct' }
  | { type: 'setDetail'; detail: Detail }
  | { type: 'toggleOutlines' }
  | { type: 'toggleLabels' }
  | { type: 'setYearFrom'; year: number }
  | { type: 'setYearTo'; year: number }
  | { type: 'openTrend' }
  | { type: 'closeTrend' }

/** Returns `state` itself when nothing changes, so React can skip the render. */
export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'selectStory':
      if (action.storyId === state.storyId) return state
      return { ...state, storyId: action.storyId, metricId: getStory(action.storyId).metrics[0].id }
    case 'selectMetric':
      if (!findMetric(getStory(state.storyId), action.metricId)) return state
      return { ...state, metricId: action.metricId }
    case 'focusBorough':
      return { ...state, borough: action.borough, pinnedPrecinct: null }
    case 'pinPrecinct': {
      if (!isPrecinct(action.precinct)) return state
      // At city level the view stays put; inside a borough, a precinct elsewhere moves the focus.
      const borough = state.borough === null ? null : boroughOfPrecinct(action.precinct)
      return { ...state, borough, pinnedPrecinct: action.precinct }
    }
    case 'unpinPrecinct':
      return { ...state, pinnedPrecinct: null }
    case 'setDetail': {
      // Precincts aren't outlined at city borough level, so a city-level pin goes.
      const dropPin = state.borough === null && action.detail === 'borough'
      return { ...state, detail: action.detail, pinnedPrecinct: dropPin ? null : state.pinnedPrecinct }
    }
    case 'toggleOutlines':
      return { ...state, showOutlines: !state.showOutlines }
    case 'toggleLabels':
      return { ...state, showLabels: !state.showLabels }
    case 'setYearFrom':
      if (!isYear(action.year)) return state
      return { ...state, yearFrom: action.year, yearTo: action.year > state.yearTo ? action.year : state.yearTo }
    case 'setYearTo':
      if (!isYear(action.year) || action.year < state.yearFrom) return state
      return { ...state, yearTo: action.year }
    case 'openTrend':
      return { ...state, trendOpen: true }
    case 'closeTrend':
      return { ...state, trendOpen: false }
  }
}

export function effectiveDetail(state: Pick<ExplorerState, 'borough' | 'detail'>): Detail {
  return state.borough ? 'precinct' : state.detail
}

export function yearToOptions(state: ExplorerState): Year[] {
  return YEARS.filter((y) => y >= state.yearFrom)
}

/** The reducer only ever stores a layer of the current story, so this always finds one. */
export function activeMetric(state: Pick<ExplorerState, 'storyId' | 'metricId'>): Metric {
  const story = getStory(state.storyId)
  return findMetric(story, state.metricId) ?? story.metrics[0]
}
