import { PRECINCT_AREAS } from '../../domain/geography'
import type { Metric } from '../../layers'
import { layerPeriods, periodKey } from '../coverage'
import type { LayerFile } from '../file'
import { precinctAt, type PrecinctShapes } from './openDataPoints'

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

export type Weights = {
  /** Land area per precinct, in square miles. */
  landSqMi: Map<number, number>
  /** Tract -> precinct -> share of the tract's 2020 population living there. */
  tractShares: Map<string, Map<number, number>>
  /** Blocks whose interior point is in no precinct (shoreline and water). */
  unplacedBlocks: { blocks: number; population: number }
}

/** Places each block in the precinct containing its interior point, and weighs tracts by where their people live. */
export function apportion(blocks: readonly Block[], shapes: PrecinctShapes): Weights {
  const landSqMi = new Map<number, number>()
  const tractPop = new Map<string, number>()
  const inPrecinct = new Map<string, Map<number, number>>()
  const unplacedBlocks = { blocks: 0, population: 0 }
  for (const b of blocks) {
    tractPop.set(b.tract, (tractPop.get(b.tract) ?? 0) + b.population)
    const precinct = precinctAt(shapes, b.lon, b.lat)
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
  return { landSqMi, tractShares, unplacedBlocks }
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
  areaIds: readonly string[] = PRECINCT_AREAS.map((a) => a.id),
): { file: LayerFile; report: CensusYearReport[] } {
  const periods = layerPeriods(layer)
  const values: Record<string, number[]> = {}
  const denominators: Record<string, number[]> = {}
  const parts: Record<string, number[][]> = {}
  for (const id of areaIds) {
    values[id] = periods.map(() => 0)
    denominators[id] = periods.map(() => weights.landSqMi.get(Number(id)) ?? 0)
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
      for (const [precinct, share] of shares) {
        const id = String(precinct)
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
    file: { layerId: layer.id, built: new Date().toISOString(), from: periodKey(periods[0]), to: periodKey(periods[periods.length - 1]), values, denominators, parts },
    report,
  }
}
