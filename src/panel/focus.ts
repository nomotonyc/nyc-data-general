import type { LayerDataset } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { areaValue, effectiveRange, rankOf } from '../data/selectors'
import { compareSigned, formatValue, ordinal } from '../domain/format'
import { BOROUGHS, PRECINCTS, areaOfPrecinct, boroughInSentence, precinctsIn, type Borough } from '../domain/geography'
import { activeMetric, type ExplorerState } from '../explorer/state'

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'pinnedPrecinct' | 'yearFrom' | 'yearTo'>

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Value lookups for the active layer over the years it actually has. */
function reader(state: Input, ds: LayerDataset) {
  const metric = activeMetric(state)
  const { range } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const value = (ids: readonly string[]) => areaValue(ds, metric, ids, range)
  const show = (v: number) => formatValue(metric.format ?? 'count', v)
  /** A peer group's average: the mean area for counts; the group as a whole for ratios. */
  const average = (ids: readonly string[], values: readonly number[]) => (metric.aggregation === 'sum' ? mean(values) : value(ids))
  return { metric, value, show, average }
}

export type FocusSummary = {
  name: string
  /** Where it sits: rank and size. */
  context: string
  value: string
  unit: string
  /** "+12% vs. the average borough", or the highest borough for the city. */
  comparison: string
  tone: 'accent' | 'neutral'
}

/** The panel's headline for the city, a focused borough, or a pinned precinct. */
export function focusSummary(state: Input, ds: LayerDataset): FocusSummary {
  const { metric, value, show, average } = reader(state, ds)
  const cityIds = areaIdsIn(ds, null)
  const boroughValues = BOROUGHS.map((b) => value(areaIdsIn(ds, b)))
  const tone = (comparison: string) => (comparison.startsWith('+') ? 'accent' : 'neutral')

  if (state.pinnedPrecinct !== null) {
    const area = areaOfPrecinct(ds.areas, state.pinnedPrecinct)
    const own = value([area.id])
    const cityValues = cityIds.map((id) => value([id]))
    const boroughValuesOfAreas = areaIdsIn(ds, area.borough).map((id) => value([id]))
    const comparison = compareSigned(own, average(cityIds, cityValues), 'the citywide precinct average')
    return {
      name: area.label,
      context: `${area.borough} · ${ordinal(rankOf(own, boroughValuesOfAreas))} of ${boroughValuesOfAreas.length} in ${boroughInSentence(area.borough)} · ${ordinal(rankOf(own, cityValues))} of ${cityValues.length} citywide`,
      value: show(own),
      unit: metric.unit,
      comparison,
      tone: tone(comparison),
    }
  }

  if (state.borough) {
    const own = value(areaIdsIn(ds, state.borough))
    const comparison = compareSigned(own, average(cityIds, boroughValues), 'the average borough')
    return {
      name: state.borough,
      context: `${rankOf(own, boroughValues) === 1 ? 'Highest' : `${ordinal(rankOf(own, boroughValues))} highest`} of 5 boroughs · ${precinctsIn(state.borough).length} precincts`,
      value: show(own),
      unit: metric.unit,
      comparison,
      tone: tone(comparison),
    }
  }

  const highest = BOROUGHS[boroughValues.indexOf(Math.max(...boroughValues))]
  return {
    name: 'New York City',
    context: `All five boroughs · ${PRECINCTS.length} precincts`,
    value: show(value(cityIds)),
    unit: metric.unit,
    comparison: `Highest: ${highest}`,
    tone: 'neutral',
  }
}

export type BoroughBar = { borough: Borough; value: string; width: number; colour: string; current: boolean }

/** The five boroughs side by side; the focused one (or all, at city level) in the story colour. */
export function boroughBars(state: Input, ds: LayerDataset, ramp: readonly string[], muted: string): BoroughBar[] {
  const { value, show } = reader(state, ds)
  const values = BOROUGHS.map((b) => value(areaIdsIn(ds, b)))
  const max = Math.max(...values)
  return BOROUGHS.map((borough, i) => {
    const current = state.borough === borough
    return {
      borough,
      value: show(values[i]),
      width: max === 0 ? 0 : (values[i] / max) * 100,
      colour: state.borough === null || current ? ramp[3] : muted,
      current,
    }
  })
}

export type TopArea = { id: string; label: string; borough: Borough; precinct: number; value: string; rank: number; pinned: boolean }

/** The highest areas in the focused borough, or the city. */
export function topAreas(state: Input, ds: LayerDataset, count = 5): TopArea[] {
  const { value, show } = reader(state, ds)
  return ds.areas
    .filter((a) => state.borough === null || a.borough === state.borough)
    .map((area) => ({ area, v: value([area.id]) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, count)
    .map(({ area, v }, i) => ({
      id: area.id,
      label: area.label,
      borough: area.borough,
      precinct: area.precincts[0],
      value: show(v),
      rank: i + 1,
      pinned: state.pinnedPrecinct !== null && area.precincts.includes(state.pinnedPrecinct),
    }))
}
