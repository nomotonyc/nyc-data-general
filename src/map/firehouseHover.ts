import { groupUnits, parseUnits, type Firehouse, type Unit } from '../domain/firehouses'

/** What the hover card says about a firehouse. */
export type FirehouseDetails = {
  address: string
  /** Neighbourhood and borough. */
  place: string
  /** Companies, then commands; empty groups are left out. */
  groups: { label: string; units: Unit[] }[]
  /** The battalion area it stands in, or null when it is in none. */
  area: string | null
}

export function firehouseDetails(firehouse: Firehouse): FirehouseDetails {
  const { companies, commands } = groupUnits(parseUnits(firehouse.name))
  const group = (one: string, many: string, units: Unit[]) => (units.length ? [{ label: units.length === 1 ? one : many, units }] : [])
  return {
    address: firehouse.address,
    place: [firehouse.neighbourhood, firehouse.borough].filter(Boolean).join(', '),
    groups: [...group('Company', 'Companies', companies), ...group('Command', 'Commands', commands)],
    area: firehouse.battalion == null ? null : `In Battalion ${firehouse.battalion}`,
  }
}
