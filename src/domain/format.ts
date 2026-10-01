
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

/** How a layer's values are written (set per layer; count if left out). */
export type ValueFormat = 'count' | 'decimal' | 'percent' | 'minutes' | 'currency'

const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatValue(format: ValueFormat, v: number): string {
  switch (format) {
    case 'count':
      return formatCount(v)
    case 'decimal':
      return oneDecimal.format(v)
    case 'percent':
      return `${v.toFixed(1)}%`
    case 'minutes':
      return `${v.toFixed(1)} min`
    case 'currency':
      return '$' + (Math.round(v / 100) * 100).toLocaleString('en-US')
  }
}

/** For tight spaces (the Where list): large counts and amounts shortened, "1.6M", "$77.8K". */
export function formatShort(format: ValueFormat, v: number): string {
  if (format === 'count') return formatCompact(v)
  if (format === 'currency' && Math.abs(v) >= 10_000) return '$' + compact.format(v)
  return formatValue(format, v)
}

/** "49 fires", "7.4 per 10k residents"; percent, minutes and currency already say what they are. */
/** The unit to write after a value: none for formats that already say it (9.3 min, 24.2%, $77,800). */
export function unitAfter(layer: { unit: string; format?: ValueFormat }): string {
  const format = layer.format ?? 'count'
  return format === 'count' || format === 'decimal' ? layer.unit : ''
}

export function formatWithUnit(layer: { unit: string; format?: ValueFormat }, v: number): string {
  const value = formatValue(layer.format ?? 'count', v)
  const unit = unitAfter(layer)
  return unit ? `${value} ${unit}` : value
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

/** "+18% vs. the average borough" / "−24% vs. …": the sign shows the direction at a glance. */
export function compareSigned(value: number, average: number, what: string): string {
  if (average === 0) return value === 0 ? `Level with ${what}` : `Above ${what}`
  const diff = ((value - average) / average) * 100
  if (Math.abs(diff) < 0.5) return `Level with ${what}`
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(0)}% vs. ${what}`
}
