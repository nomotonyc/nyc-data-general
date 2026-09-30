import type { Metric } from './stories'

/** Whole numbers with separators; small averages keep one decimal so they stay distinguishable. */
export function formatCount(v: number): string {
  if (Math.abs(v) < 10 && !Number.isInteger(v)) return v.toFixed(1)
  return Math.round(v).toLocaleString('en-US')
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** For tight spaces: "1.6M", "31.7K"; values under 10,000 are shown in full. */
export function formatCompact(v: number): string {
  return Math.abs(v) < 10_000 ? formatCount(v) : compact.format(v)
}

/** "49 fires", "34,513 people per sq mi". */
export function formatWithUnit(metric: Metric, v: number): string {
  return `${formatCount(v)} ${metric.unit}`
}

export function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0])
}

/** "34% above the city average"; `what` completes the sentence. */
export function compareToAverage(value: number, average: number, what: string): string {
  if (average === 0) return value === 0 ? `Level with ${what}` : `Above ${what}`
  const diff = ((value - average) / average) * 100
  if (Math.abs(diff) < 0.5) return `Level with ${what}`
  return `${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'above' : 'below'} ${what}`
}
