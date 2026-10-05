import type { LayerDataset, YearRange } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { areaValue, effectiveRange } from '../data/selectors'
import { BOROUGHS, type Borough, type Geography } from '../domain/geography'
import { activeMetric, effectiveDetail, type Detail, type ExplorerState } from '../explorer/state'
import { equalIntervalScale } from './colorScale'

export type Choropleth = {
  level: Detail
  /** The focused borough; everything else is hidden. */
  focus: Borough | null
  /** Fill per borough (always set; shown at borough level). */
  boroughs: Partial<Record<Borough, string>>
  /** Which areas `areas` colours. */
  geography: Geography
  /** Fill per area number in the geography (all of them; a focused borough's on its own scale). */
  areas: Record<number, string>
  /** Lowest and highest value shown, for the legend. */
  lo: number
  hi: number
  range: YearRange
  adjusted: boolean
}

/** The parts of the explorer state that decide the colours. */
export type ChoroplethInput = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'detail' | 'yearFrom' | 'yearTo'>

/** Which colour each borough and area gets, from the explorer state and the story's ramp. */
export function choropleth(state: ChoroplethInput, ds: LayerDataset, ramp: readonly string[]): Choropleth {
  const metric = activeMetric(state)
  const { range, adjusted } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const level = effectiveDetail(state)

  // Both levels are always coloured: layer opacity decides which shows, so a
  // fade between them goes colour to colour instead of through white.
  const boroughValues = BOROUGHS.map((b) => areaValue(ds, metric, areaIdsIn(ds, b), range))
  const boroughColour = equalIntervalScale(boroughValues, ramp)
  const boroughs = Object.fromEntries(BOROUGHS.map((b, i) => [b, boroughColour(boroughValues[i])]))

  // Every precinct is coloured on the city-wide scale; a focused borough's
  // precincts are then rescaled to that borough, so its extremes use the whole
  // ramp. The ones outside keep their city colour while they fade out.
  const colourAreas = (areas: typeof ds.areas) => {
    const values = areas.map((a) => areaValue(ds, metric, [a.id], range))
    const colour = equalIntervalScale(values, ramp)
    const fills: Record<number, string> = {}
    areas.forEach((area, i) => (fills[area.number] = colour(values[i])))
    return { values, fills }
  }
  const city = colourAreas(ds.areas)
  const focused = state.borough === null ? city : colourAreas(ds.areas.filter((a) => a.borough === state.borough))
  const areas = { ...city.fills, ...focused.fills }
  const areaValues = focused.values

  // The legend describes whichever level is showing.
  const shown = level === 'borough' ? boroughValues : areaValues
  return { level, focus: state.borough, boroughs, geography: ds.geography, areas, lo: Math.min(...shown), hi: Math.max(...shown), range, adjusted }
}
