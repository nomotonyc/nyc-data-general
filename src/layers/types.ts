import type { ValueFormat } from '../domain/format'
import type { StoryId, Year } from '../domain/stories'

export type Source = {
  name: string
  publisher: string
  url: string
  /** What this layer takes from the source, in a few words. */
  used: string
}

/**
 * A layer: everything the app needs to show one measure. Each lives in its own
 * `src/layers/<id>.layer.ts` file and is picked up automatically.
 */
export type Metric = {
  /** Unique, lower-case, hyphenated; also the file name. */
  id: string
  /** Which story's Layer picker it appears in. */
  story: StoryId
  /** Position in that picker, lowest first. */
  order: number
  /** The title in the picker, legend and hover card. */
  label: string
  /** The one-line subtitle under the title in the picker. */
  note: string
  /** Shown after values: "fires", "people per sq mi". */
  unit: string
  /** How values are written: count (default), decimal, percent, minutes or currency. */
  format?: ValueFormat
  /**
   * sum: counts add up. ratio: numerators and denominators add up separately, then
   * divide — this also covers shares, rates and averages (medians can't be combined
   * across places, so show an average instead).
   */
  aggregation: 'sum' | 'ratio'
  /**
   * Ratio layers only: multiply the ratio, e.g. 100 for a percentage share,
   * 10000 for "per 10k residents", 1/60 for seconds shown as minutes.
   */
  scale?: number
  /** What the data supports. */
  data: {
    resolution: 'month' | 'year'
    /** 'dispatch' shows precincts 105 and 116 as one area (see DISPATCH_AREAS). */
    areas: 'precincts' | 'dispatch'
    firstYear: Year
    lastYear: Year
  }
  /** The panel's breakdown of the value into parts. */
  breakdown: { title: string; parts: readonly string[] }
  /** This layer's own data sources. Boundary credits are added for every layer (layerSources). */
  sources: readonly [Source, ...Source[]]
  /**
   * Plain sentences for "How this is calculated", specific to this layer.
   * Standard caveats (merged precincts, partial final year) are added (layerMethod).
   */
  method: readonly string[]
  /** Until real data lands: the yearly range per area, and any seasonal swing (peakMonth 0 = January). */
  sample: { lo: number; hi: number; seasonality?: { amplitude: number; peakMonth: number } }
}
