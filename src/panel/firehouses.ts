import { groupUnits, parseUnits, type Firehouse, type UnitKind } from '../domain/firehouses'
import type { Borough } from '../domain/geography'
import type { ExplorerState } from '../explorer/state'

/** Whose firehouses the panel shows: a pinned battalion's, or a focused borough's. */
export type FirehouseScope = { kind: 'battalion'; number: number } | { kind: 'borough'; borough: Borough }

export function firehouseScope(state: Pick<ExplorerState, 'geography' | 'borough' | 'pinnedArea'>): FirehouseScope | null {
  if (state.pinnedArea !== null) {
    return state.geography === 'battalions' ? { kind: 'battalion', number: Number(state.pinnedArea.replace(/^bn/, '')) } : null
  }
  return state.borough ? { kind: 'borough', borough: state.borough } : null
}

const KIND_NAMES: Partial<Record<UnitKind, [string, string]>> = {
  Engine: ['Engine', 'Engines'],
  Ladder: ['Ladder', 'Ladders'],
  Squad: ['Squad', 'Squads'],
  Rescue: ['Rescue company', 'Rescue companies'],
  Marine: ['Marine company', 'Marine companies'],
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export type FirehouseSummary = {
  title: string
  totals: string
  /** Companies by kind, in the cards' order (engine, ladder, squad, rescue, marine). */
  byKind: { kind: UnitKind; label: string }[]
  /** Each firehouse, for a battalion; a borough has too many to list. */
  list: { id: number; address: string; units: string }[] | null
}

/**
 * The firehouses standing in a battalion's area or a borough, and their companies by kind.
 * "In the area" is where a firehouse stands, which is close to, but not the same as, the
 * companies FDNY assigns to the battalion.
 */
export function firehousesIn(firehouses: readonly Firehouse[], scope: FirehouseScope): FirehouseSummary {
  const here = firehouses.filter((f) => (scope.kind === 'battalion' ? f.battalion === scope.number : f.borough === scope.borough))
  const units = here.map((f) => parseUnits(f.name))
  const companies = units.flatMap((u) => groupUnits(u).companies)
  // A building that only houses a command (the Bronx and Queens borough commands) is listed, not counted as a firehouse.
  const withCompanies = units.filter((u) => groupUnits(u).companies.length > 0).length
  const byKind = (Object.keys(KIND_NAMES) as UnitKind[]).flatMap((kind) => {
    const n = companies.filter((c) => c.kind === kind).length
    const [one, many] = KIND_NAMES[kind]!
    return n ? [{ kind, label: count(n, one, many) }] : []
  })
  return {
    title: scope.kind === 'battalion' ? `Firehouses in Battalion ${scope.number}’s area` : `Firehouses in ${scope.borough}`,
    totals: `${count(withCompanies, 'firehouse', 'firehouses')} · ${count(companies.length, 'company', 'companies')}`,
    byKind,
    list: scope.kind === 'battalion' ? here.map((f, i) => ({ id: f.id, address: f.address, units: units[i].map((u) => u.label).join(' · ') })) : null,
  }
}
