import type { LayerDataset } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { effectiveRange, periodIndices, series } from '../data/selectors'
import { areaOfPrecinct } from '../domain/geography'
import { yearLabel } from '../domain/stories'
import { activeMetric, type ExplorerState } from '../explorer/state'

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'pinnedPrecinct' | 'yearFrom' | 'yearTo'>
export type TrendPalette = { accent: string; ramp: readonly string[]; city: string }

type Point = { x: number; y: number }
export type TrendLine = {
  name: string
  colour: string
  width: number
  points: Point[]
  dots: (Point & { r: number; filled: boolean })[]
}

export type Trend = {
  /** The place the chart is about: the innermost of city, borough, pinned precinct. */
  title: string
  period: string
  change: string | null
  /** Wider places first, drawn underneath; the place in focus last, on top. */
  lines: TrendLine[]
  /** The lines' raw values, in the same order. */
  values: number[][]
  key: { name: string; colour: string }[]
  ticks: { x: number; text: string; anchor: 'start' | 'middle' | 'end' }[]
  note: string | null
  /** Set instead of lines when there is nothing to draw. */
  empty: string | null
  aria: string
}

/** Chart area in SVG units: 296 wide, values between y 8 and 72, labels below 80. */
const WIDTH = 296
const LEFT = 6
const TOP = 8
const BOTTOM = 72
export const signed = (pct: number) => `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`
export const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The places on a trend chart and their values over the chosen years; shared by the panel and the expanded view. */
export function trendSeries(state: Input, ds: LayerDataset, palette: TrendPalette) {
  const metric = activeMetric(state)
  const { range } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const indices = periodIndices(ds, range)
  const periods = indices.map((i) => ds.periods[i])
  const monthly = metric.data.resolution === 'month'

  const places: { name: string; ids: string[]; colour: string }[] = [{ name: 'New York City', ids: areaIdsIn(ds, null), colour: palette.city }]
  if (state.borough) places.push({ name: state.borough, ids: areaIdsIn(ds, state.borough), colour: palette.ramp[1] })
  if (state.pinnedPrecinct !== null) {
    const area = areaOfPrecinct(ds.areas, state.pinnedPrecinct)
    places.push({ name: area.label, ids: [area.id], colour: palette.accent })
  }
  // The place in focus is always drawn in the story colour.
  places[places.length - 1].colour = palette.accent
  // Counts over areas of different sizes only compare fairly per precinct.
  const perPrecinct = places.length > 1 && metric.aggregation === 'sum'
  const values = indices.length < 2 ? [] : places.map((p) => series(ds, metric, p.ids, range, perPrecinct))
  return { metric, range, periods, monthly, places, values, perPrecinct }
}

/** "Mar 2025" for a month, "2023" for a yearly estimate. */
export const periodLabel = (p: { year: number; month: number | null }) => (p.month === null ? String(p.year) : `${MONTHS[p.month]} ${p.year}`)

/** Polylines and dots for each place; long monthly runs dot only each January. */
export function plotLines(
  data: ReturnType<typeof trendSeries>,
  x: (i: number) => number,
  y: (v: number) => number,
  radius: { focus: number; other: number },
): TrendLine[] {
  const { places, values, periods, monthly } = data
  const dotted = (i: number) => !monthly || periods.length <= 24 || periods[i].month === 0
  return places.map((place, li): TrendLine => {
    const isFocus = li === places.length - 1
    const points = values[li].map((v, i) => ({ x: x(i), y: y(v) }))
    return {
      name: place.name,
      colour: place.colour,
      width: isFocus ? 2.5 : 1.75,
      points,
      dots: points.filter((_, i) => dotted(i)).map((p) => ({ ...p, r: isFocus ? radius.focus : radius.other, filled: isFocus })),
    }
  })
}

/** The trend over the chosen years: the place in focus in the story colour, wider places dimmed behind it. */
export function trend(state: Input, ds: LayerDataset, palette: TrendPalette): Trend {
  const data = trendSeries(state, ds, palette)
  const { metric, range, periods, monthly, places, values, perPrecinct } = data
  const years = range.from === range.to ? yearLabel(range.from) : `${range.from}–${yearLabel(range.to)}`
  const focus = places[places.length - 1]
  const period = `${monthly ? 'Monthly' : 'Yearly estimates'} · ${years}`
  const aria = `${metric.label}, ${monthly ? 'monthly' : 'yearly'}, ${years}, for ${[...places].reverse().map((p) => p.name).join(', ')}`

  if (periods.length < 2) {
    return {
      title: focus.name, period, change: null, lines: [], values: [], key: [], ticks: [], note: null, aria,
      empty: 'Only one yearly estimate in these years. Choose a wider range to see a trend.',
    }
  }

  const all = values.flat()
  const lo = Math.min(...all)
  const span = Math.max(...all) - lo
  const x = (i: number) => LEFT + (i * (WIDTH - 2 * LEFT)) / (periods.length - 1)
  const y = (v: number) => (span === 0 ? (TOP + BOTTOM) / 2 : BOTTOM - ((v - lo) / span) * (BOTTOM - TOP))
  const lines = plotLines(data, x, y, { focus: 2.5, other: 2 })
  const focusValues = values[values.length - 1]
  let change: string
  if (monthly) {
    const first = mean(focusValues.slice(0, 3))
    change = `${signed(((mean(focusValues.slice(-3)) - first) / first) * 100)} first to last quarter`
  } else {
    change = `${signed(((focusValues[focusValues.length - 1] - focusValues[0]) / focusValues[0]) * 100)} since ${range.from}`
  }

  let ticks: Trend['ticks']
  if (monthly && range.from === range.to) {
    const last = periods.length - 1
    ticks = [...new Set([0, 3, 6, 9, last])]
      .filter((i) => i <= last)
      .map((i, n, all) => ({ x: x(i), text: MONTHS[periods[i].month ?? 0], anchor: n === 0 ? 'start' : n === all.length - 1 ? 'end' : 'middle' }))
  } else {
    const starts = periods.map((p, i) => ({ p, i })).filter(({ p }) => p.month === null || p.month === 0)
    ticks = starts.map(({ p, i }, n) => ({
      x: x(i),
      text: String(p.year),
      anchor: n === 0 ? 'start' : !monthly && n === starts.length - 1 ? 'end' : 'middle',
    }))
  }

  return {
    title: focus.name,
    period,
    change,
    lines,
    values,
    key: places.length > 1 ? [...lines].reverse().map((l) => ({ name: l.name, colour: l.colour })) : [],
    ticks,
    note: perPrecinct ? 'Average per precinct, so the lines compare fairly' : null,
    empty: null,
    aria,
  }
}
