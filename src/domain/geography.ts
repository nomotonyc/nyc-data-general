export const BOROUGHS = ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'] as const
import { NEIGHBORHOOD_AREAS } from './neighborhoods.generated'
export type Borough = (typeof BOROUGHS)[number]

/** NYPD precincts as published in NYC Open Data dataset y76i-bdw7. */
export const PRECINCTS: readonly number[] = [
  1, 5, 6, 7, 9, 10, 13, 14, 17, 18, 19, 20, 22, 23, 24, 25, 26, 28, 30, 32, 33, 34,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52,
  60, 61, 62, 63, 66, 67, 68, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 81, 83, 84, 88, 90, 94,
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  120, 121, 122, 123,
]

/** NYPD numbers precincts in one block per borough. */
const BLOCKS: ReadonlyArray<readonly [first: number, last: number, borough: Borough]> = [
  [1, 34, 'Manhattan'],
  [40, 52, 'Bronx'],
  [60, 94, 'Brooklyn'],
  [100, 116, 'Queens'],
  [120, 123, 'Staten Island'],
]

export function isPrecinct(n: number): boolean {
  return PRECINCTS.includes(n)
}

export function boroughOfPrecinct(n: number): Borough {
  const block = isPrecinct(n) && BLOCKS.find(([first, last]) => n >= first && n <= last)
  if (!block) throw new RangeError(`${n} is not an NYPD precinct`)
  return block[2]
}

export function precinctsIn(borough: Borough): number[] {
  return PRECINCTS.filter((n) => boroughOfPrecinct(n) === borough)
}

/** For use mid-sentence: "the Bronx", otherwise the name unchanged. */
export function boroughInSentence(borough: Borough): string {
  return borough === 'Bronx' ? 'the Bronx' : borough
}

/** How the city is divided below the boroughs: FDNY divisions or battalions, or NYPD precincts. */
export type Geography = 'divisions' | 'precincts' | 'battalions' | 'neighborhoods'
/** The order shown in the Areas control. */
export const GEOGRAPHIES: readonly Geography[] = ['divisions', 'precincts', 'battalions', 'neighborhoods']

/** A unit values are reported for: one division, precinct or battalion. */
export type Area = {
  /** Unique across geographies: "14" is precinct 14, "bn14" is battalion 14, "div14" is division 14. */
  id: string
  kind: 'division' | 'precinct' | 'battalion' | 'neighborhood'
  number: number
  label: string
  borough: Borough
}

export const PRECINCT_AREAS: readonly Area[] = PRECINCTS.map((n) => ({
  id: String(n),
  kind: 'precinct',
  number: n,
  label: `Precinct ${n}`,
  borough: boroughOfPrecinct(n),
}))

/**
 * The 49 FDNY battalions (NYC Open Data xzng-ft6f) and the borough each lies in, taken from
 * the precincts covering it; each lies within its borough, judged by points across its whole shape
 * (battalionData.test).
 */
export const BATTALIONS: readonly { number: number; borough: Borough }[] = (
  [
    [1, 'Manhattan'], [2, 'Manhattan'], [3, 'Bronx'], [4, 'Manhattan'], [6, 'Manhattan'], [7, 'Manhattan'],
    [8, 'Manhattan'], [9, 'Manhattan'], [10, 'Manhattan'], [11, 'Manhattan'], [12, 'Manhattan'], [13, 'Manhattan'],
    [14, 'Bronx'], [15, 'Bronx'], [16, 'Manhattan'], [17, 'Bronx'], [18, 'Bronx'], [19, 'Bronx'], [20, 'Bronx'],
    [21, 'Staten Island'], [22, 'Staten Island'], [23, 'Staten Island'], [26, 'Bronx'], [27, 'Bronx'],
    [28, 'Brooklyn'], [31, 'Brooklyn'], [32, 'Brooklyn'], [33, 'Brooklyn'], [35, 'Brooklyn'], [37, 'Brooklyn'],
    [38, 'Brooklyn'], [39, 'Brooklyn'], [40, 'Brooklyn'], [41, 'Brooklyn'], [42, 'Brooklyn'], [43, 'Brooklyn'],
    [44, 'Brooklyn'], [45, 'Queens'], [46, 'Queens'], [47, 'Queens'], [48, 'Brooklyn'], [49, 'Queens'],
    [50, 'Queens'], [51, 'Queens'], [52, 'Queens'], [53, 'Queens'], [54, 'Queens'], [57, 'Brooklyn'], [58, 'Brooklyn'],
  ] as const
).map(([number, borough]) => ({ number, borough }))

export const BATTALION_AREAS: readonly Area[] = BATTALIONS.map(({ number, borough }) => ({
  id: `bn${number}`,
  kind: 'battalion',
  number,
  label: `Battalion ${number}`,
  borough,
}))

/**
 * FDNY's nine operational divisions and their battalions. Some division commands cross borough
 * lines; `borough` is the division command's primary borough and keeps focused views consistent
 * with the rest of the explorer.
 */
export const DIVISIONS: readonly { number: number; borough: Borough; battalions: readonly number[] }[] = [
  { number: 1, borough: 'Manhattan', battalions: [1, 2, 4, 6, 7] },
  { number: 3, borough: 'Manhattan', battalions: [8, 9, 10, 11, 12] },
  { number: 6, borough: 'Bronx', battalions: [3, 14, 16, 17, 26] },
  { number: 7, borough: 'Bronx', battalions: [13, 15, 18, 19, 20, 27] },
  { number: 8, borough: 'Staten Island', battalions: [21, 22, 23, 40, 42, 43] },
  { number: 11, borough: 'Brooklyn', battalions: [28, 31, 32, 35, 48, 57] },
  { number: 13, borough: 'Queens', battalions: [47, 50, 51, 54] },
  { number: 14, borough: 'Queens', battalions: [45, 46, 49, 52, 53] },
  { number: 15, borough: 'Brooklyn', battalions: [33, 37, 38, 39, 41, 44, 58] },
]

export const DIVISION_AREAS: readonly Area[] = DIVISIONS.map(({ number, borough }) => ({
  id: `div${number}`,
  kind: 'division',
  number,
  label: `Division ${number}`,
  borough,
}))

export { NEIGHBORHOOD_AREAS }

/** The id of a geography's area from its number, as map features carry it. */
export function areaIdOf(geography: Geography, number: number): string {
  if (geography === 'neighborhoods') return `hood${number}`
  if (geography === 'divisions') return `div${number}`
  return geography === 'battalions' ? `bn${number}` : String(number)
}

export function areasOf(geography: Geography): readonly Area[] {
  if (geography === 'neighborhoods') return NEIGHBORHOOD_AREAS
  if (geography === 'divisions') return DIVISION_AREAS
  return geography === 'battalions' ? BATTALION_AREAS : PRECINCT_AREAS
}

export function areaById(areas: readonly Area[], id: string): Area {
  const area = areas.find((a) => a.id === id)
  if (!area) throw new RangeError(`No area ${id}`)
  return area
}

/** How to name a geography's areas in sentences and controls. */
export function areaNoun(geography: Geography): { one: string; many: string; title: string } {
  if (geography === 'neighborhoods') return { one: 'neighborhood', many: 'neighborhoods', title: 'Neighborhood' }
  if (geography === 'divisions') return { one: 'division', many: 'divisions', title: 'Division' }
  return geography === 'battalions'
    ? { one: 'battalion', many: 'battalions', title: 'Battalion' }
    : { one: 'precinct', many: 'precincts', title: 'Precinct' }
}

/** ZIP codes in precinct 116, which NYPD created from the southeast of 105 in late 2024. */
const PRECINCT_116_ZIPS = new Set(['11413', '11422', '11430', '11434', '11436'])

/**
 * The precinct a dispatch record belongs in. Records from before the split, and most EMS
 * records since, say 105 for addresses now in 116, so 105 and 116 are told apart by ZIP
 * code (checked against 2025 fire records, which FDNY tags 116: 99.9% agree). Other
 * precincts are kept as recorded. See data-sources.md.
 */
export function dispatchPrecinct(precinct: string, zip: string | undefined): number {
  const n = Number(precinct)
  if ((n !== 105 && n !== 116) || !zip) return n
  return PRECINCT_116_ZIPS.has(zip) ? 116 : 105
}
