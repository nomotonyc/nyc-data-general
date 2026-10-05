import { areaNoun } from '../domain/geography'
import type { Placement, YearRange } from '../data/dataset'
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
  /** Set when the years shown differ from the years chosen, or battalion figures are partly estimated. */
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
  placement: readonly Placement[] | null = null,
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
  // Estimates must show on the map itself, not only in the collapsed Data sources.
  // Only where battalions are on the map: borough figures are the same in both views.
  const estimated = plan.geography === 'battalions' && plan.level === 'area' && placement ? placement.filter((p) => !p.exact).reduce((s, p) => s + p.share, 0) : 0
  if (estimated > 0) {
    const part = estimated >= 0.995 ? 'By battalion: estimates · see Data sources' : `By battalion: ${Math.max(1, Math.round(estimated * 100))}% estimated · see Data sources`
    note = note ? `${note} · ${part}` : part
  }
  return {
    title: `${metric.label}, ${shown} · by ${plan.level === 'borough' ? 'borough' : areaNoun(plan.geography).one}`,
    steps: [...ramp],
    lo: formatValue(metric.format ?? 'count', plan.lo),
    hi: formatValue(metric.format ?? 'count', plan.hi),
    note,
  }
}
