import type { LayerDataset } from '../data/dataset'
import { formatValue } from '../domain/format'
import { getStory, type Year } from '../domain/stories'
import type { ExplorerState } from '../explorer/state'
import { MONTHS, mean, periodLabel, plotLines, signed, trendSeries, type TrendLine, type TrendPalette } from './trend'

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'pinnedArea' | 'yearFrom' | 'yearTo'>

export type ExpandedTrend = {
  kicker: string
  title: string
  /** The first and last years the chart shows: those picked, cut to the data's. */
  years: { from: Year; to: Year }
  sub: string
  stats: { label: string; value: string; note: string }[]
  /** Index of the period the readout, guide and highlighted dots show. */
  hovered: number
  readout: { period: string; values: { name: string; colour: string; value: string }[] }
  lines: (Omit<TrendLine, 'dots'> & { dots: (TrendLine['dots'][number] & { highlight: boolean })[] })[]
  grid: { y: number; text: string }[]
  ticks: { x: number; text: string; current: boolean }[]
  guideX: number
  /** Each period's column, edge to edge: where pointing reads that period (periodAt). */
  columns: { x: number; width: number }[]
}

/** Where the chart draws, in SVG units: the gridlines from left to right, the values from top to bottom. */
export type ChartSize = { width: number; height: number; left: number; right: number; plotLeft: number; plotWidth: number; top: number; bottom: number; baseline: number }

/**
 * The chart for a width in pixels. It's drawn at its real size, not scaled down, so its labels
 * stay readable on a phone: the margins stay put and the plot takes what's left, 40% as tall as
 * wide, between 300 and 360. At the design's 900 it's the design's chart.
 */
export function chartSize(width: number): ChartSize {
  const height = Math.round(Math.min(360, Math.max(300, width * 0.4)))
  return { width, height, left: 64, right: width - 16, plotLeft: 80, plotWidth: width - 112, top: 28, bottom: height - 60, baseline: height - 44 }
}

/** The design's chart (900 × 360): what's drawn until the dialog has measured its width. */
export const BIG = chartSize(900)

/** The least room between the period labels along the bottom, in pixels. */
const TICK_GAP = 36

/** The period under a point on the chart, in SVG units; the nearest end for a point beyond either. */
export function periodAt(columns: readonly { x: number; width: number }[], x: number): number {
  const i = columns.findIndex((c) => x < c.x + c.width)
  return i === -1 ? columns.length - 1 : i
}

/** The larger trend view: the panel's lines with stats, gridlines and a readout for one period. */
export function expandedTrend(state: Input, ds: LayerDataset, palette: TrendPalette, hover: number | null, size: ChartSize = BIG): ExpandedTrend | null {
  const data = trendSeries(state, ds, palette)
  const { metric, periods, monthly, places, values, perArea, noun } = data
  if (periods.length < 2) return null

  const show = (v: number) => formatValue(metric.format ?? 'count', v)
  const n = periods.length
  const last = n - 1
  const hovered = hover === null || hover > last ? last : hover
  const all = values.flat()
  const lo = Math.min(...all)
  const span = Math.max(...all) - lo
  const step = size.plotWidth / last
  const x = (i: number) => size.plotLeft + i * step
  const y = (v: number) => (span === 0 ? (size.top + size.bottom) / 2 : size.bottom - ((v - lo) / span) * (size.bottom - size.top))

  const focus = places[places.length - 1]
  const main = values[values.length - 1]
  const unit = monthly ? 'month' : 'year'
  const peak = main.indexOf(Math.max(...main))
  const low = main.indexOf(Math.min(...main))
  const total = main.reduce((a, b) => a + b, 0)

  let first: ExpandedTrend['stats'][number]
  if (metric.aggregation === 'sum' && !perArea) first = { label: 'Total for the period', value: show(total), note: metric.unit }
  else if (perArea) first = { label: `${monthly ? 'Monthly' : 'Yearly'} average`, value: show(mean(main)), note: `per ${noun.one}` }
  else first = { label: 'Average for the period', value: show(mean(main)), note: metric.unit }

  let lastStat: ExpandedTrend['stats'][number]
  if (places.length > 1) {
    const diff = ((mean(main) - mean(values[0])) / mean(values[0])) * 100
    lastStat = {
      label: 'Compared with New York City',
      value: Math.abs(diff) < 0.5 ? 'Level' : `${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'higher' : 'lower'}`,
      note: perArea ? `per-${noun.one} average` : 'period average',
    }
  } else if (monthly) {
    const start = mean(main.slice(0, 3))
    lastStat = { label: 'First to last quarter', value: signed(((mean(main.slice(-3)) - start) / start) * 100), note: 'change across the period' }
  } else {
    lastStat = { label: `Since ${periods[0].year}`, value: signed(((main[last] - main[0]) / main[0]) * 100), note: 'change across the period' }
  }

  // One year: every month. A range: each year, plus quarters (or half-years beyond three years).
  // Too crowded for the width: a range keeps only its years; then every second (or third…) label.
  const years = new Set(periods.map((p) => p.year)).size
  const every = years > 3 ? 6 : 3
  const indexed = periods.map((p, i) => ({ p, i }))
  const spacing = (ls: typeof indexed) => (ls.length > 1 ? (ls[1].i - ls[0].i) * step : Infinity)
  let labelled = indexed.filter(({ p }) => p.month === null || years === 1 || p.month % every === 0)
  if (years > 1 && spacing(labelled) < TICK_GAP) labelled = indexed.filter(({ p }) => p.month === null || p.month === 0)
  const stride = Math.max(1, Math.ceil(TICK_GAP / spacing(labelled)))
  const ticks = labelled
    .filter((_, k) => k % stride === 0)
    .map(({ p, i }) => ({ x: x(i), text: p.month === null || (years > 1 && p.month === 0) ? String(p.year) : MONTHS[p.month], current: i === hovered }))

  const against = places.slice(0, -1).map((p) => p.name).reverse()
  return {
    kicker: `${getStory(state.storyId).name} · ${monthly ? 'Monthly' : 'Yearly'} trend`,
    title: `${metric.label} · ${focus.name}`,
    years: { from: periods[0].year, to: periods[last].year },
    sub: `${monthly ? 'Month by month' : 'Year by year'}, ${periodLabel(periods[0])} to ${periodLabel(periods[last])}${against.length ? `, against ${against.join(' and ')}` : ''}`,
    stats: [
      first,
      { label: `Peak ${unit}`, value: periodLabel(periods[peak]), note: show(main[peak]) },
      { label: `Lowest ${unit}`, value: periodLabel(periods[low]), note: show(main[low]) },
      lastStat,
    ],
    hovered,
    readout: {
      period: periodLabel(periods[hovered]),
      values: places.map((p, i) => ({ name: p.name, colour: p.colour, value: show(values[i][hovered]) })).reverse(),
    },
    lines: plotLines(data, x, y, monthly && n > 24 ? { focus: 3, other: 2.5 } : { focus: 4, other: 3 }).map((line, li) => ({
      ...line,
      dots: [
        ...line.dots.map((d) => ({ ...d, highlight: false })),
        { x: x(hovered), y: y(values[li][hovered]), r: 5.5, filled: true, highlight: true },
      ],
    })),
    grid: [0, 1, 2, 3, 4].map((k) => {
      const v = lo + (span * k) / 4
      return { y: y(v), text: show(v) }
    }),
    ticks,
    guideX: x(hovered),
    columns: periods.map((_, i) => ({ x: x(i) - step / 2, width: step })),
  }
}
