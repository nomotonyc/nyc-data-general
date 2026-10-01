import type { LayerDataset } from '../data/dataset'
import { areaIdsIn } from '../data/places'
import { breakdownShares, effectiveRange } from '../data/selectors'
import { areaOfPrecinct } from '../domain/geography'
import { activeMetric, type ExplorerState } from '../explorer/state'

type Input = Pick<ExplorerState, 'storyId' | 'metricId' | 'borough' | 'pinnedPrecinct' | 'yearFrom' | 'yearTo'>

export type Breakdown = {
  title: string
  parts: { label: string; width: number; share: string; colour: string }[]
}

/** The layer's breakdown for the place in focus: each part's share over the chosen years. */
export function breakdown(state: Input, ds: LayerDataset, palette: { ramp: readonly string[]; greys: readonly string[] }): Breakdown {
  const layer = activeMetric(state)
  const { range } = effectiveRange(ds, { from: state.yearFrom, to: state.yearTo })
  const ids =
    state.pinnedPrecinct !== null ? [areaOfPrecinct(ds.areas, state.pinnedPrecinct).id] : areaIdsIn(ds, state.borough)
  const shares = breakdownShares(ds, ids, range)
  // Darkest first down the story's ramp, then greys for any parts beyond it.
  const colours = [...[...palette.ramp].reverse(), ...palette.greys]
  return {
    title: layer.breakdown.title,
    parts: layer.breakdown.parts.map((label, i) => ({
      label,
      width: shares[i] * 100,
      share: shares[i] > 0 && shares[i] < 0.005 ? '<1%' : `${Math.round(shares[i] * 100)}%`,
      colour: colours[i % colours.length],
    })),
  }
}
