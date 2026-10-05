/**
 * FDNY firehouses and the units based in each, as the FDNY Firehouse Listing names them
 * ("Battalion 4/Engine 15/Ladder 18"). Companies answer calls; commands run them.
 */
const COMPANIES = ['Engine', 'Ladder', 'Squad', 'Rescue', 'Marine'] as const
const COMMANDS = ['Battalion', 'Marine Battalion', 'Division', 'Borough Command'] as const
const ORDER: readonly string[] = [...COMPANIES, ...COMMANDS]

/** One firehouse, as src/data/firehouses.json carries it. */
export type Firehouse = {
  id: number
  /** The listing's name, which lists the units ("Battalion 4/Engine 15/Ladder 18"); see parseUnits. */
  name: string
  address: string
  neighbourhood: string
  borough: string
  /** The battalion area the firehouse stands in, or null outside every one (a pier, say). */
  battalion: number | null
  /** The highest command it houses, if any; the map marks each rank differently. */
  command: CommandRank | null
}

export type UnitKind = (typeof COMPANIES)[number] | (typeof COMMANDS)[number]
export type Unit = { kind: UnitKind; label: string }

function parseUnit(part: string): Unit & { number: number } {
  const text = part.trim()
  const numbered = /^(Engine|Ladder|Squad|Rescue|Marine|Battalion|Division) (\d+)$/.exec(text)
  if (numbered) return { kind: numbered[1] as UnitKind, label: text, number: Number(numbered[2]) }
  // The listing spells it "Marine Battlion".
  if (/^Marine Batt(a)?lion$/.test(text)) return { kind: 'Marine Battalion', label: 'Marine Battalion', number: 0 }
  if (/^(Manhattan|Bronx|Brooklyn|Queens|Staten Island) Borough Command$/.test(text)) return { kind: 'Borough Command', label: text, number: 0 }
  throw new Error(`Unknown FDNY unit "${text}"`)
}

/** Every unit in a firehouse name: companies (engine, ladder, squad, rescue, marine), then commands from the smallest up. */
export function parseUnits(name: string): Unit[] {
  return name
    .split('/')
    .map(parseUnit)
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.number - b.number)
    .map(({ kind, label }) => ({ kind, label }))
}

const isCompany = (u: Unit) => (COMPANIES as readonly string[]).includes(u.kind)

export function groupUnits(units: readonly Unit[]): { companies: Unit[]; commands: Unit[] } {
  return { companies: units.filter(isCompany), commands: units.filter((u) => !isCompany(u)) }
}

/**
 * FDNY's ranks of command above the companies, lowest first: a battalion chief runs a battalion
 * (3–7 firehouses), a deputy chief a division (several battalions), an assistant chief a borough.
 */
export const COMMAND_RANKS = ['battalion', 'division', 'borough'] as const
export type CommandRank = (typeof COMMAND_RANKS)[number]

const RANK_OF: Partial<Record<UnitKind, CommandRank>> = {
  Battalion: 'battalion',
  'Marine Battalion': 'battalion',
  Division: 'division',
  'Borough Command': 'borough',
}

/** The highest command among a firehouse's units, or null if it houses none. */
export function commandRank(units: readonly Unit[]): CommandRank | null {
  const ranks = units.flatMap((u) => (RANK_OF[u.kind] ? [COMMAND_RANKS.indexOf(RANK_OF[u.kind]!)] : []))
  return ranks.length ? COMMAND_RANKS[Math.max(...ranks)] : null
}
