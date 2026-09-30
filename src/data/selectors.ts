import type { Metric, Year } from '../domain/stories'
import type { StoryDataset, YearRange } from './dataset'

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

/**
 * The part of `range` the dataset covers. A range entirely outside the data
 * collapses to the nearest year. `adjusted` tells the UI to say so.
 */
export function effectiveRange(ds: StoryDataset, range: YearRange): { range: YearRange; adjusted: boolean } {
  const first = ds.periods[0].year
  const last = ds.periods[ds.periods.length - 1].year
  const clamp = (y: Year): Year => (y < first ? first : y > last ? last : y)
  const from = clamp(range.from)
  const to = clamp(range.to)
  return { range: { from, to }, adjusted: from !== range.from || to !== range.to }
}

export function periodIndices(ds: StoryDataset, range: YearRange): number[] {
  const out: number[] = []
  ds.periods.forEach((p, i) => {
    if (p.year >= range.from && p.year <= range.to) out.push(i)
  })
  return out
}

/** Periods in the range; throws rather than letting an empty range read as zeros. */
function indicesIn(ds: StoryDataset, range: YearRange): number[] {
  const indices = periodIndices(ds, range)
  if (indices.length === 0) {
    throw new Error(`Dataset ${ds.storyId} has no data for ${range.from}–${range.to}; pass effectiveRange(...).range`)
  }
  return indices
}

type Table = StoryDataset['values']

function valuesFor(ds: StoryDataset, table: Table, metric: Metric, areaId: string): readonly number[] {
  const byArea = table[metric.id]
  if (!byArea) throw new Error(`Dataset ${ds.storyId} has no layer ${metric.id}`)
  const values = byArea[areaId]
  if (!values) throw new Error(`Dataset ${ds.storyId} has no ${metric.id} values for area ${areaId}`)
  return values
}

function total(ds: StoryDataset, table: Table, metric: Metric, areaIds: readonly string[], indices: readonly number[]) {
  return sum(areaIds.flatMap((id) => {
    const values = valuesFor(ds, table, metric, id)
    return indices.map((i) => values[i])
  }))
}

function ratio(ds: StoryDataset, metric: Metric, areaIds: readonly string[], indices: readonly number[]) {
  const denominator = total(ds, ds.denominators, metric, areaIds, indices)
  if (denominator === 0) throw new Error(`Dataset ${ds.storyId}: ${metric.id} denominator is 0 for ${areaIds.join(', ')}`)
  return total(ds, ds.values, metric, areaIds, indices) / denominator
}

function precinctCount(ds: StoryDataset, areaIds: readonly string[]): number {
  return sum(areaIds.map((id) => {
    const area = ds.areas.find((a) => a.id === id)
    if (!area) throw new Error(`Dataset ${ds.storyId} has no area ${id}`)
    return area.precincts.length
  }))
}

/**
 * One number for some areas over a range. Counts add up; ratios divide the
 * total numerator by the total denominator, never averaging ratios.
 */
export function areaValue(
  ds: StoryDataset,
  metric: Metric,
  areaIds: readonly string[],
  range: YearRange,
): number {
  const indices = indicesIn(ds, range)
  if (metric.aggregation === 'ratio') return ratio(ds, metric, areaIds, indices)
  return total(ds, ds.values, metric, areaIds, indices)
}

/** 1 is the highest. Equal values share a rank. */
export function rankOf(value: number, peers: readonly number[]): number {
  return peers.filter((p) => p > value).length + 1
}

/**
 * One value per period in the range. `perPrecinct` divides summed counts by
 * the number of precincts the areas cover (a merged area counts each of its
 * precincts), so a precinct, a borough and the city share one scale.
 */
export function series(
  ds: StoryDataset,
  metric: Metric,
  areaIds: readonly string[],
  range: YearRange,
  perPrecinct = false,
): number[] {
  const divisor = perPrecinct && metric.aggregation === 'sum' ? precinctCount(ds, areaIds) : 1
  return indicesIn(ds, range).map((i) =>
    metric.aggregation === 'ratio' ? ratio(ds, metric, areaIds, [i]) : total(ds, ds.values, metric, areaIds, [i]) / divisor,
  )
}

/** Each breakdown part's share of the total over the range; zeros when nothing was recorded. */
export function breakdownShares(ds: StoryDataset, areaIds: readonly string[], range: YearRange): number[] {
  const indices = indicesIn(ds, range)
  const totals: number[] = []
  for (const id of areaIds) {
    const periods = ds.parts[id]
    if (!periods) throw new Error(`Dataset ${ds.storyId} has no breakdown for area ${id}`)
    for (const i of indices) {
      periods[i].forEach((n, part) => {
        totals[part] = (totals[part] ?? 0) + n
      })
    }
  }
  const all = sum(totals)
  return totals.map((n) => (all === 0 ? 0 : n / all))
}
