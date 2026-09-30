import type { YearRange } from '../data/dataset'
import { formatValue } from '../domain/format'
import { yearLabel } from '../domain/stories'
import type { Metric } from '../layers'
import type { Choropleth } from './choropleth'

export type LegendDetails = {
  /** "Structural fires, 2025 · by borough" */
  title: string
  /** The five colour steps, lightest (lowest) first. */
  steps: string[]
  lo: string
  hi: string
  /** Set when the years shown differ from the years chosen. */
  note: string | null
}

const yearsLabel = (r: YearRange) => (r.from === r.to ? yearLabel(r.from) : `${r.from}–${yearLabel(r.to)}`)

/** `available` is the span the layer's data covers, for the note. */
export function legendDetails(
  plan: Choropleth,
  metric: Metric,
  ramp: readonly string[],
  requested: YearRange,
  available: YearRange,
): LegendDetails {
  const shown = yearsLabel(plan.range)
  let note: string | null = null
  if (plan.adjusted) {
    const asked = yearsLabel(requested)
    // Short enough for one line under the scale.
    if (plan.range.to < requested.from) note = `No ${asked} estimates yet · showing ${shown}`
    else if (plan.range.from > requested.to) note = `No ${asked} estimates · showing ${shown}`
    else note = `Estimates cover ${yearsLabel(available)} · showing ${shown}`
  }
  return {
    title: `${metric.label}, ${shown} · by ${plan.level}`,
    steps: [...ramp],
    lo: formatValue(metric.format ?? 'count', plan.lo),
    hi: formatValue(metric.format ?? 'count', plan.hi),
    note,
  }
}
