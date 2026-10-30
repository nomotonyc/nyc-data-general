import { areaIdOf, areasOf, type Geography } from '../../domain/geography'
import type { Metric } from '../../layers'
import { layerPeriods, periodKey } from '../coverage'
import type { LayerFile } from '../file'
import { areaNumberAt, type AreaShapes } from './openDataPoints'

/** The city's five counties: Bronx, Kings, New York, Queens, Richmond. */
const NYC_COUNTIES = new Set(['005', '047', '061', '081', '085'])
export const SQ_M_PER_SQ_MI = 2_589_988.11

/** A 2020 census block in the city. */
export type Block = { tract: string; population: number; landSqM: number; lat: number; lon: number }

/** P.L. 94-171 geographic header fields (0-based), from the 2020 technical documentation. */
const PL = { sumlev: 2, geocode: 9, arealand: 84, pop100: 90, intptlat: 92, intptlon: 93 }

/** One line of the 2020 P.L. 94-171 geographic header, if it is a block in the city. */
export function parseBlock(line: string): Block | null {
  const x = line.split('|')
  if (x[PL.sumlev] !== '750' || !NYC_COUNTIES.has(x[PL.geocode].slice(2, 5))) return null
  return {
    tract: x[PL.geocode].slice(0, 11),
    population: Number(x[PL.pop100]),
    landSqM: Number(x[PL.arealand]),
    lat: Number(x[PL.intptlat]),
    lon: Number(x[PL.intptlon]),
  }
}

const cells = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `B01001_E${String(from + i).padStart(3, '0')}`)

/** B01001 (sex by age) cells in each age group, male then female, in breakdown order. */
export const AGE_GROUPS: readonly (readonly string[])[] = [
  [...cells(3, 6), ...cells(27, 30)], // under 18
  [...cells(7, 12), ...cells(31, 36)], // 18–34
  [...cells(13, 19), ...cells(37, 43)], // 35–64
  [...cells(20, 25), ...cells(44, 49)], // 65 and over
]

export type TractEstimate = { population: number; ages: number[] }

/** NYC tracts from an ACS table-based summary file for B01001: total population and age groups. */
export function parseAcsTracts(lines: readonly string[]): Map<string, TractEstimate> {
  const [header, ...rows] = lines
  const column = new Map(header.split('|').map((name, i) => [name, i]))
  const total = column.get('B01001_E001')!
  const groups = AGE_GROUPS.map((g) => g.map((c) => column.get(c)!))
  const tracts = new Map<string, TractEstimate>()
  for (const row of rows) {
    if (!row.startsWith('1400000US36')) continue
    const x = row.split('|')
    const tract = x[0].slice(-11)
    if (!NYC_COUNTIES.has(tract.slice(2, 5))) continue
    tracts.set(tract, { population: Number(x[total]), ages: groups.map((g) => g.reduce((s, i) => s + Number(x[i]), 0)) })
  }
  return tracts
}

export type TractTableEstimate = { numerator: number; denominator: number; parts: number[] }

function tableRows(lines: readonly string[], callback: (tract: string, cells: string[], header: Map<string, number>) => TractTableEstimate | null): Map<string, TractTableEstimate> {
  const [head, ...rows] = lines
  if (!head) throw new Error('ACS table file is empty')
  const header = new Map(head.split('|').map((name, i) => [name, i]))
  const out = new Map<string, TractTableEstimate>()
  for (const row of rows) {
    if (!row.startsWith('1400000US36')) continue
    const cells = row.split('|')
    const tract = cells[0].slice(-11)
    if (!NYC_COUNTIES.has(tract.slice(2, 5))) continue
    const estimate = callback(tract, cells, header)
    if (estimate) out.set(tract, estimate)
  }
  return out
}

function tableColumn(header: Map<string, number>, name: string): number {
  const index = header.get(name)
  if (index === undefined) throw new Error('ACS table is missing ' + name)
  return index
}

function estimate(cells: string[], index: number): number {
  const value = Number(cells[index])
  return Number.isFinite(value) ? value : 0
}

/** B19013 median, B11001 households and four grouped B19001 income bands. */
export function parseIncomeTracts(median: readonly string[], households: readonly string[], distribution: readonly string[]): Map<string, TractTableEstimate> {
  const medians = tableRows(median, (_tract, cells, header) => {
    const value = estimate(cells, tableColumn(header, 'B19013_E001'))
    return value > 0 ? { numerator: value, denominator: 1, parts: [] } : null
  })
  const householdCounts = tableRows(households, (_tract, cells, header) => ({
    numerator: estimate(cells, tableColumn(header, 'B11001_E001')), denominator: 1, parts: [],
  }))
  const incomeBands = tableRows(distribution, (_tract, cells, header) => {
    const bands: number[] = []
    for (const [from, to] of [[2, 5], [6, 10], [11, 14], [15, 17]]) {
      let total = 0
      for (let code = from; code <= to; code++) {
        const variable = 'B19001_E' + String(code).padStart(3, '0')
        total += estimate(cells, tableColumn(header, variable))
      }
      bands.push(total)
    }
    return { numerator: 0, denominator: 1, parts: bands }
  })
  const out = new Map<string, TractTableEstimate>()
  for (const [tract, med] of medians) {
    const count = householdCounts.get(tract)?.numerator ?? 0
    const bands = incomeBands.get(tract)?.parts ?? []
    if (count > 0 && bands.length === 4) out.set(tract, { numerator: med.numerator * count, denominator: count, parts: bands })
  }
  return out
}

const UNINSURED_CODES = [5, 8, 11, 14, 17, 20, 23, 26, 29, 33, 36, 39, 42, 45, 48, 51, 54, 57]

/** B27001 total civilian noninstitutionalized population and uninsured counts. */
export function parseInsuranceTracts(lines: readonly string[]): Map<string, TractTableEstimate> {
  return tableRows(lines, (_tract, cells, header) => {
    const population = estimate(cells, tableColumn(header, 'B27001_E001'))
    const uninsured = UNINSURED_CODES.reduce((sum, code) => {
      const variable = 'B27001_E' + String(code).padStart(3, '0')
      return sum + estimate(cells, tableColumn(header, variable))
    }, 0)
    const insured = Math.max(0, population - uninsured)
    return { numerator: insured, denominator: population, parts: [insured, uninsured] }
  })
}

export type Weights = {
  /** Which areas the weights place people in. */
  geography: Geography
  /** Land area per area number, in square miles. */
  landSqMi: Map<number, number>
  /** Tract -> area number -> share of the tract's 2020 population living there. */
  tractShares: Map<string, Map<number, number>>
  /** Blocks whose interior point is in no area (shoreline and water). */
  unplacedBlocks: { blocks: number; population: number }
}

/** Places each block in the precinct (or battalion) containing its interior point, and weighs tracts by where their people live. */
export function apportion(blocks: readonly Block[], shapes: AreaShapes, geography: Geography = 'precincts', fallback?: (lon: number, lat: number) => number | null): Weights {
  const landSqMi = new Map<number, number>()
  const tractPop = new Map<string, number>()
  const inPrecinct = new Map<string, Map<number, number>>()
  const unplacedBlocks = { blocks: 0, population: 0 }
  for (const b of blocks) {
    tractPop.set(b.tract, (tractPop.get(b.tract) ?? 0) + b.population)
    const precinct = areaNumberAt(shapes, b.lon, b.lat, geography) ?? fallback?.(b.lon, b.lat) ?? null
    if (precinct === null) {
      unplacedBlocks.blocks++
      unplacedBlocks.population += b.population
      continue
    }
    landSqMi.set(precinct, (landSqMi.get(precinct) ?? 0) + b.landSqM / SQ_M_PER_SQ_MI)
    const shares = inPrecinct.get(b.tract) ?? new Map<number, number>()
    shares.set(precinct, (shares.get(precinct) ?? 0) + b.population)
    inPrecinct.set(b.tract, shares)
  }
  const tractShares = new Map<string, Map<number, number>>()
  for (const [tract, pops] of inPrecinct) {
    const total = tractPop.get(tract)!
    if (total > 0) tractShares.set(tract, new Map([...pops].map(([p, n]) => [p, n / total])))
  }
  return { geography, landSqMi, tractShares, unplacedBlocks }
}

export type CensusYearReport = { year: number; counted: number; unplaced: number }

/**
 * Population and age per precinct and year, each tract's ACS estimate split by where its
 * 2020 residents live; land is the denominator, so the layer's ratio is people per square mile.
 * ACS population in tracts with no 2020 residents can't be placed and is reported.
 */
export function densityFile(
  layer: Metric,
  weights: Weights,
  acsByYear: ReadonlyMap<number, ReadonlyMap<string, TractEstimate>>,
  options: { geography?: Geography; areaIds?: readonly string[] } = {},
): { file: LayerFile; report: CensusYearReport[] } {
  const geography = options.geography ?? weights.geography
  const areaIds = options.areaIds ?? areasOf(geography).map((a) => a.id)
  const numberOf = new Map(areasOf(geography).map((a) => [a.id, a.number]))
  const periods = layerPeriods(layer)
  const values: Record<string, number[]> = {}
  const denominators: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const id of areaIds) {
    values[id] = periods.map(() => 0)
    denominators[id] = periods.map(() => weights.landSqMi.get(numberOf.get(id) ?? -1) ?? 0)
    parts[id] = periods.map(() => AGE_GROUPS.map(() => 0))
  }
  const report: CensusYearReport[] = []
  periods.forEach((period, i) => {
    const acs = acsByYear.get(period.year)
    if (!acs) throw new Error(`${layer.id}: no ACS estimates for ${period.year}`)
    let counted = 0
    let unplaced = 0
    for (const [tract, est] of acs) {
      const shares = weights.tractShares.get(tract)
      if (!shares) {
        unplaced += est.population
        continue
      }
      for (const [number, share] of shares) {
        const id = areaIdOf(geography, number)
        if (!(id in values)) continue
        values[id][i] += est.population * share
        est.ages.forEach((n, g) => (parts[id][i][g] += n * share))
      }
      counted += est.population
    }
    report.push({ year: period.year, counted, unplaced })
  })
  // Whole people and four decimals of a square mile keep the file small.
  for (const id of areaIds) {
    values[id] = values[id].map(Math.round)
    denominators[id] = denominators[id].map((v) => Math.round(v * 1e4) / 1e4)
    parts[id] = parts[id].map((counts) => counts.map(Math.round))
  }
  return {
    file: {
      layerId: layer.id,
      ...(geography === 'precincts' ? {} : { geography, placement: [{ method: 'the 2020 census blocks residents live in', share: 1, exact: true }] }),
      built: new Date().toISOString(), from: periodKey(periods[0]), to: periodKey(periods[periods.length - 1]), values, denominators, parts },
    report,
  }
}

/** Allocate a tract-level ratio and its supporting breakdown counts to a mapped geography. */
export function tableRatioFile(
  layer: Metric,
  weights: Weights,
  tracts: ReadonlyMap<string, TractTableEstimate>,
  options: { geography?: Geography; areaIds?: readonly string[] } = {},
): { file: LayerFile; report: { year: number; counted: number; unplaced: number }[] } {
  const geography = options.geography ?? weights.geography
  const areaIds = options.areaIds ?? areasOf(geography).map((area) => area.id)
  const periods = layerPeriods(layer)
  const values: Record<string, number[]> = {}
  const denominators: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const id of areaIds) {
    values[id] = periods.map(() => 0)
    denominators[id] = periods.map(() => 0)
    parts[id] = periods.map(() => layer.breakdown.parts.map(() => 0))
  }
  let counted = 0
  let unplaced = 0
  for (const [tract, row] of tracts) {
    const shares = weights.tractShares.get(tract)
    if (!shares) {
      unplaced += row.denominator
      continue
    }
    for (const [number, share] of shares) {
      const id = areaIdOf(geography, number)
      if (!(id in values)) continue
      values[id][0] += row.numerator * share
      denominators[id][0] += row.denominator * share
      row.parts.forEach((n, part) => { parts[id][0][part] += n * share })
    }
    counted += row.denominator
  }
  for (const id of areaIds) {
    values[id] = values[id].map((n) => Math.round(n * 100) / 100)
    denominators[id] = denominators[id].map((n) => Math.round(n * 100) / 100)
    parts[id] = parts[id].map((row) => row.map((n) => Math.round(n * 100) / 100))
  }
  const report = [{ year: periods[0].year, counted, unplaced }]
  const file: LayerFile = {
    layerId: layer.id,
    ...(geography === 'precincts' ? {} : { geography, placement: [{ method: '2020 census-block residents within each area', share: 1, exact: false }] }),
    built: new Date().toISOString(),
    from: periodKey(periods[0]),
    to: periodKey(periods[periods.length - 1]),
    values, denominators, parts,
  }
  return { file, report }
}
