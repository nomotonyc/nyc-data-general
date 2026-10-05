import { areasOf, type Borough, type Geography } from '../domain/geography'
import { STORIES, YEARS, isYear, type StoryId, type Year } from '../domain/stories'
import { LAYERS, getLayer, layerGeographies, layersOf, type Metric } from '../layers'

export type Detail = 'borough' | 'area'

export type ExplorerState = {
  storyId: StoryId
  metricId: string
  /** Focused borough; null is the whole city. */
  borough: Borough | null
  /** Precincts or battalions: the areas below the boroughs. Only geographies the layer has. */
  geography: Geography
  /** An area id in `geography`, always inside `borough`: pinning an area focuses its borough. */
  pinnedArea: string | null
  /** Map level at city scale: boroughs, or the geography's areas. A focused borough always shows areas. */
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
  metricId: layersOf(STORIES[0].id)[0].id,
  borough: null,
  geography: 'precincts',
  pinnedArea: null,
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
  | { type: 'setGeography'; geography: Geography }
  | { type: 'pinArea'; id: string }
  | { type: 'unpinArea' }
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
      return keepGeography(state, { ...state, storyId: action.storyId, metricId: layersOf(action.storyId)[0].id })
    case 'selectMetric':
      if (!LAYERS.some((l) => l.id === action.metricId && l.story === state.storyId)) return state
      return keepGeography(state, { ...state, metricId: action.metricId })
    case 'setGeography':
      if (action.geography === state.geography || !layerGeographies(getLayer(state.metricId)).includes(action.geography)) return state
      // Precincts and battalions don't nest, so a pin can't carry over; the borough can.
      return { ...state, geography: action.geography, pinnedArea: null }
    case 'focusBorough':
      return { ...state, borough: action.borough, pinnedArea: null }
    case 'pinArea': {
      const area = areasOf(state.geography).find((a) => a.id === action.id)
      if (!area) return state
      // Pinning zooms into the area's borough, from the city view too.
      return { ...state, borough: area.borough, pinnedArea: area.id }
    }
    case 'unpinArea':
      return { ...state, pinnedArea: null }
    case 'setDetail':
      return { ...state, detail: action.detail }
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
  return state.borough ? 'area' : state.detail
}

/** After a layer change: back to precincts, unpinned, when the new layer lacks the current geography. */
function keepGeography(before: ExplorerState, after: ExplorerState): ExplorerState {
  if (layerGeographies(getLayer(after.metricId)).includes(before.geography)) return after
  return { ...after, geography: 'precincts', pinnedArea: null }
}

export function yearToOptions(state: ExplorerState): Year[] {
  return YEARS.filter((y) => y >= state.yearFrom)
}

/** The reducer only ever stores a layer of the current story, so this always finds one. */
export function activeMetric(state: Pick<ExplorerState, 'storyId' | 'metricId'>): Metric {
  const layers = layersOf(state.storyId)
  return layers.find((l) => l.id === state.metricId) ?? layers[0]
}
