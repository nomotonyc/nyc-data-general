import { describe, expect, it } from 'vitest'
import { commandRank, parseUnits, type Firehouse } from '../domain/firehouses'
import { initialExplorerState } from '../explorer/state'
import { firehouseScope, firehousesIn } from './firehouses'

const fh = (id: number, name: string, borough: string, battalion: number, address = `${id} Main Street`): Firehouse => ({
  id,
  name,
  address,
  neighbourhood: '',
  borough,
  battalion,
  command: commandRank(parseUnits(name)),
})
const all = [
  fh(1, 'Battalion 31/Engine 207/Ladder 110', 'Brooklyn', 31, '172 Tillary Street'),
  fh(2, 'Engine 205/Ladder 118', 'Brooklyn', 31, '74 Middagh Street'),
  fh(3, 'Marine 6', 'Brooklyn', 31, 'Pier 6'),
  fh(4, 'Engine 226', 'Brooklyn', 32),
  fh(5, 'Division 11', 'Brooklyn', 32),
  fh(6, 'Engine 1/Ladder 24', 'Manhattan', 7),
]

describe('firehouseScope', () => {
  const city = { ...initialExplorerState, geography: 'precincts' as const }
  it('is the pinned battalion, in battalion view', () => {
    expect(firehouseScope({ ...city, geography: 'battalions', borough: 'Brooklyn', pinnedArea: 'bn31' })).toEqual({ kind: 'battalion', number: 31 })
  })

  it('is the focused borough when nothing is pinned, in either view', () => {
    expect(firehouseScope({ ...city, borough: 'Brooklyn' })).toEqual({ kind: 'borough', borough: 'Brooklyn' })
    expect(firehouseScope({ ...city, geography: 'battalions', borough: 'Brooklyn' })).toEqual({ kind: 'borough', borough: 'Brooklyn' })
  })

  it('is nothing for the whole city or a pinned precinct', () => {
    expect(firehouseScope(city)).toBeNull()
    expect(firehouseScope({ ...city, borough: 'Brooklyn', pinnedArea: '84' })).toBeNull()
  })
})

describe('firehousesIn', () => {
  it('counts a battalion area’s firehouses and companies by type, and lists each firehouse', () => {
    const summary = firehousesIn(all, { kind: 'battalion', number: 31 })
    expect(summary.title).toBe('Firehouses in Battalion 31’s area')
    expect(summary.totals).toBe('3 firehouses · 5 companies')
    expect(summary.byKind).toEqual([
      { kind: 'Engine', label: '2 Engines' },
      { kind: 'Ladder', label: '2 Ladders' },
      { kind: 'Marine', label: '1 Marine company' },
    ])
    expect(summary.list).toEqual([
      { id: 1, address: '172 Tillary Street', units: 'Engine 207 · Ladder 110 · Battalion 31' },
      { id: 2, address: '74 Middagh Street', units: 'Engine 205 · Ladder 118' },
      { id: 3, address: 'Pier 6', units: 'Marine 6' },
    ])
  })

  it('counts a borough without listing its many firehouses, leaving out buildings that only house a command', () => {
    const summary = firehousesIn(all, { kind: 'borough', borough: 'Brooklyn' })
    expect(summary.title).toBe('Firehouses in Brooklyn')
    expect(summary.totals).toBe('4 firehouses · 6 companies')
    expect(summary.list).toBeNull()
  })

  it('uses the singular for one', () => {
    expect(firehousesIn([all[3]], { kind: 'battalion', number: 32 }).totals).toBe('1 firehouse · 1 company')
  })
})
