import type { StoryDataset, YearRange } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { areaValue, effectiveRange, rankOf } from '../data/selectors'
import { compareToAverage, formatCount, formatWithUnit, ordinal } from '../domain/format'
import { BOROUGHS, areaOfPrecinct, boroughInSentence, precinctsIn } from '../domain/geography'
import { yearLabel, type Metric } from '../domain/stories'
import { activeMetric, type ExplorerState } from '../explorer/state'
import type { Target } from './interaction'

export type HoverDetails = {
  title: string
  subtitle: string
  /** Layer and years, e.g. "Structural fires, 2025". */
  metric: string
  value: string
  ranks: { label: string; rank: string; of: string }[]
  /**
   * Where the place sits between the lowest and highest values of its peers:
   * positions run from 0 (lowest) to 100 (highest); caption and ends say so in words.
   */
  strip: { dot: number; cityAverage: number; boroughAverage: number | null; caption: string; lo: string; hi: string }
  /** "34% above the city average", and for a precinct, its borough's average. */
  comparisons: string[]
  hint: string
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** A place's average peer: the mean area for counts; the place as a whole for ratios. */
function average(ds: StoryDataset, metric: Metric, areaIds: readonly string[], values: readonly number[], range: YearRange) {
  return metric.aggregation === 'sum' ? mean(values) : areaValue(ds, metric, areaIds, range)
}

/** What the hover card says about a borough or precinct. */
export function hoverDetails(
  state: Pick<ExplorerState, 'storyId' | 'metricId' | 'yearFrom' | 'yearTo' | 'pinnedPrecinct'>,
  ds: StoryDataset,
  target: Target,
): HoverDetails {
  const metric = activeMetric(state)
  const { range } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const years = range.from === range.to ? yearLabel(range.from) : `${range.from}–${yearLabel(range.to)}`
  const value = (ids: readonly string[]) => areaValue(ds, metric, ids, range)
  const position = (lo: number, hi: number) => (v: number) => (hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100)

  if (target.kind === 'precinct') {
    const area = areaOfPrecinct(ds.areas, target.precinct)
    const own = value([area.id])
    const cityIds = ds.areas.map((a) => a.id)
    const boroughIds = areaIdsIn(ds, area.borough)
    const cityValues = cityIds.map((id) => value([id]))
    const boroughValues = boroughIds.map((id) => value([id]))
    const cityAverage = average(ds, metric, cityIds, cityValues, range)
    const boroughAverage = average(ds, metric, boroughIds, boroughValues, range)
    const at = position(Math.min(...cityValues), Math.max(...cityValues))
    const pinned = state.pinnedPrecinct !== null && area.precincts.includes(state.pinnedPrecinct)
    return {
      title: area.label,
      subtitle: area.borough,
      metric: `${metric.label}, ${years}`,
      value: formatWithUnit(metric, own),
      ranks: [
        { label: `In ${boroughInSentence(area.borough)}`, rank: ordinal(rankOf(own, boroughValues)), of: `of ${boroughValues.length}` },
        { label: 'Citywide', rank: ordinal(rankOf(own, cityValues)), of: `of ${cityValues.length}` },
      ],
      strip: {
        dot: at(own),
        cityAverage: at(cityAverage),
        boroughAverage: at(boroughAverage),
        caption: `Among all ${cityValues.length} precincts`,
        lo: formatCount(Math.min(...cityValues)),
        hi: formatCount(Math.max(...cityValues)),
      },
      comparisons: [
        compareToAverage(own, cityAverage, 'the city average'),
        compareToAverage(own, boroughAverage, `the ${area.borough} average`),
      ],
      hint: pinned ? 'Pinned' : 'Click to pin this precinct',
    }
  }

  const { borough } = target
  const own = value(areaIdsIn(ds, borough))
  const boroughValues = BOROUGHS.map((b) => value(areaIdsIn(ds, b)))
  const cityIds = areaIdsIn(ds, null)
  const cityAverage = average(ds, metric, cityIds, boroughValues, range)
  const at = position(Math.min(...boroughValues), Math.max(...boroughValues))

  let second: HoverDetails['ranks'][number]
  if (metric.aggregation === 'sum') {
    second = { label: 'Share of the city', rank: `${Math.round((own / value(cityIds)) * 100)}%`, of: `of all ${metric.unit}` }
  } else {
    const areas = ds.areas.filter((a) => a.borough === borough)
    const top = areas.reduce((best, a) => (value([a.id]) > value([best.id]) ? a : best))
    second = { label: 'Highest precinct', rank: `No. ${top.precincts.join(' & ')}`, of: formatWithUnit(metric, value([top.id])) }
  }

  return {
    title: borough,
    subtitle: `Borough · ${precinctsIn(borough).length} precincts`,
    metric: `${metric.label}, ${years}`,
    value: formatWithUnit(metric, own),
    ranks: [{ label: 'Among boroughs', rank: ordinal(rankOf(own, boroughValues)), of: 'of 5' }, second],
    strip: {
      dot: at(own),
      cityAverage: at(cityAverage),
      boroughAverage: null,
      caption: 'Among the 5 boroughs',
      lo: formatCount(Math.min(...boroughValues)),
      hi: formatCount(Math.max(...boroughValues)),
    },
    comparisons: [compareToAverage(own, cityAverage, metric.aggregation === 'sum' ? 'the average borough' : 'the city as a whole')],
    hint: `Click to focus on ${borough}`,
  }
}

/** Below-right of the pointer, flipped near the right and bottom edges, never off the top or left. */
export function tooltipPosition(
  pointer: { x: number; y: number },
  card: { width: number; height: number },
  area: { width: number; height: number },
): { left: number; top: number } {
  const left = pointer.x + 16 + card.width > area.width ? pointer.x - 16 - card.width : pointer.x + 16
  const top = pointer.y + 12 + card.height > area.height ? pointer.y - 12 - card.height : pointer.y + 12
  return { left: Math.max(8, left), top: Math.max(8, top) }
}
