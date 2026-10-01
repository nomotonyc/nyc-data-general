export const BOROUGHS = ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'] as const
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

/** The unit a layer's values are reported for: a precinct. */
export type Area = {
  id: string
  label: string
  borough: Borough
  precincts: readonly number[]
}

export const PRECINCT_AREAS: readonly Area[] = PRECINCTS.map((n) => ({
  id: String(n),
  label: `Precinct ${n}`,
  borough: boroughOfPrecinct(n),
  precincts: [n],
}))

export function areaOfPrecinct(areas: readonly Area[], precinct: number): Area {
  const area = areas.find((a) => a.precincts.includes(precinct))
  if (!area) throw new RangeError(`No area contains precinct ${precinct}`)
  return area
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
