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

/** The unit a layer's values are reported for: one precinct, or several that can't be told apart. */
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

const SOUTHEAST_QUEENS: Area = {
  id: '105+116',
  label: 'Precincts 105 & 116',
  borough: 'Queens',
  precincts: [105, 116],
}

/**
 * Fire and EMS dispatch data file southeast Queens under 105 and 116
 * inconsistently since NYPD split them in 2024, so those layers treat the two
 * as one area. See data-sources.md.
 */
export const DISPATCH_AREAS: readonly Area[] = PRECINCT_AREAS.flatMap((a) =>
  a.id === '105' ? [SOUTHEAST_QUEENS] : a.id === '116' ? [] : [a],
)

export function areaOfPrecinct(areas: readonly Area[], precinct: number): Area {
  const area = areas.find((a) => a.precincts.includes(precinct))
  if (!area) throw new RangeError(`No area contains precinct ${precinct}`)
  return area
}
