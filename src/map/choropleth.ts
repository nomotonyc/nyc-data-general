import type { StoryDataset, YearRange } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { areaValue, effectiveRange } from '../data/selectors'
import { BOROUGHS, type Borough } from '../domain/geography'
import { activeMetric, effectiveDetail, type Detail, type ExplorerState } from '../explorer/state'
import { equalIntervalScale } from './colorScale'

export type Choropleth = {
  level: Detail
  /** The focused borough; everything else is hidden. */
  focus: Borough | null
  /** Fill per borough at borough level; empty at precinct level. */
  boroughs: Partial<Record<Borough, string>>
  /** Fill per precinct number at precinct level; a merged area colours all its precincts. */
  precincts: Record<number, string>
  /** Lowest and highest value shown, for the legend. */
  lo: number
  hi: number
  range: YearRange
  adjusted: boolean
}

/** The parts of the explorer state that decide the colours. */
export type ChoroplethInput = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'detail' | 'yearFrom' | 'yearTo'>

/** Which colour each borough or precinct gets, from the explorer state and the story's ramp. */
export function choropleth(state: ChoroplethInput, ds: StoryDataset, ramp: readonly string[]): Choropleth {
  const metric = activeMetric(state)
  const { range, adjusted } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const level = effectiveDetail(state)

  if (level === 'borough') {
    const values = BOROUGHS.map((b) => areaValue(ds, metric, areaIdsIn(ds, b), range))
    const colour = equalIntervalScale(values, ramp)
    const boroughs = Object.fromEntries(BOROUGHS.map((b, i) => [b, colour(values[i])]))
    return { level, focus: state.borough, boroughs, precincts: {}, lo: Math.min(...values), hi: Math.max(...values), range, adjusted }
  }

  // A focused borough scales to its own areas, so its extremes use the whole ramp.
  const areas = ds.areas.filter((a) => state.borough === null || a.borough === state.borough)
  const values = areas.map((a) => areaValue(ds, metric, [a.id], range))
  const colour = equalIntervalScale(values, ramp)
  const precincts: Record<number, string> = {}
  areas.forEach((area, i) => {
    for (const p of area.precincts) precincts[p] = colour(values[i])
  })
  return { level, focus: state.borough, boroughs: {}, precincts, lo: Math.min(...values), hi: Math.max(...values), range, adjusted }
}
