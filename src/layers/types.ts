import type { ValueFormat } from '../domain/format'
import type { Geography } from '../domain/geography'
import type { StoryId, Year } from '../domain/stories'

export type Source = {
  name: string
  publisher: string
  url: string
  /** What this layer takes from the source, in a few words. */
  used: string
}

/**
 * How a layer is built from NYC Open Data: records matching `where`, counted by
 * precinct, month and breakdown part (scripts/build-layer.mjs). With `sumField`
 * the layer is a ratio: the field's sum over the number of records, e.g. an
 * average response time.
 */
export type OpenDataCountsBuild = {
  kind: 'open-data-counts'
  /** The dataset id, as in https://data.cityofnewyork.us/d/<id>. */
  dataset: string
  /** SoQL condition for the records counted. */
  where: string
  /** Timestamp field that decides the month. */
  dateField: string
  /** Field holding the NYPD precinct number. */
  precinctField: string
  /** Field holding the ZIP code, used to tell precincts 105 and 116 apart (dispatchPrecinct). */
  zipField: string
  /** The field (or SoQL expression) the breakdown groups. */
  partField: string
  /** Ratio layers only: the field summed as the numerator; the record count is the denominator. */
  sumField?: string
  /** Community and council district fields; with them, battalion estimates split finer areas (battalionPlacement). */
  districtFields?: { community: string; council: string }
  /** Fire records' alarm box fields, used to place records in battalions (battalionPlacement). */
  alarmBox?: { boroughField: string; numberField: string; locationField: string }
  /** Breakdown part -> the raw values of partField it covers, in breakdown order. Every value seen must be listed. */
  parts: Readonly<Record<string, readonly string[]>>
}

/**
 * How a count layer is built from NYC Open Data records that have coordinates but no
 * precinct: each record matching `where` is placed in the precinct containing it (the
 * map's precinct shapes), then counted by precinct, month and breakdown part.
 */
export type OpenDataPointsBuild = {
  kind: 'open-data-points'
  /** The dataset id, as in https://data.cityofnewyork.us/d/<id>. */
  dataset: string
  /** SoQL condition for the records counted. */
  where: string
  /** Timestamp field that decides the month. */
  dateField: string
  latitudeField: string
  longitudeField: string
  /** What one record is, for the placement note: "crash" gives "each crash’s coordinates". */
  record: string
  /** The field (or SoQL expression) the breakdown groups. */
  partField: string
  /** Breakdown part -> the raw values of partField it covers, in breakdown order. */
  parts: Readonly<Record<string, readonly string[]>>
  sumField?: never
}

/**
 * How population density is built from Census Bureau bulk files: 2020 census blocks
 * (population, land area, interior point) place people and land in precincts, and each
 * year's ACS 5-year tract estimates of table B01001 (sex by age) are split among precincts
 * by where the tract's 2020 residents live (scripts/build-layer.mjs).
 */
export type CensusDensityBuild = {
  kind: 'census-density'
  /** The 2020 P.L. 94-171 redistricting file for New York State (zip). */
  blocks: string
  /** An ACS table-based summary file for B01001, with {year} for the release year. */
  acs: string
  sumField?: never
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
  /**
   * Exactly what the number is, in one plain sentence, shown under the headline value
   * so a screenshot or presentation can't lose it: "Incidents FDNY was dispatched to
   * and classified as structural fires".
   */
  measure: string
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
  /** The geographies the layer has data for; precincts only when omitted. */
  geographies?: readonly Geography[]
  /** How real data is built. Without it the layer shows sample values. */
  build?: OpenDataCountsBuild | OpenDataPointsBuild | CensusDensityBuild
  /** Until real data lands: the yearly range per area, and any seasonal swing (peakMonth 0 = January). */
  sample: { lo: number; hi: number; seasonality?: { amplitude: number; peakMonth: number } }
}
