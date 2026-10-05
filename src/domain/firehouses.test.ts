import { describe, expect, it } from 'vitest'
import { commandRank, groupUnits, parseUnits } from './firehouses'

describe('parseUnits', () => {
  it('reads each unit from a firehouse name, companies first, then commands from the smallest up', () => {
    expect(parseUnits('Brooklyn Borough Command/Division 11/Battalion 31/Engine 207/Ladder 110')).toEqual([
      { kind: 'Engine', label: 'Engine 207' },
      { kind: 'Ladder', label: 'Ladder 110' },
      { kind: 'Battalion', label: 'Battalion 31' },
      { kind: 'Division', label: 'Division 11' },
      { kind: 'Borough Command', label: 'Brooklyn Borough Command' },
    ])
  })

  it('orders companies engine, ladder, squad, rescue, marine', () => {
    expect(parseUnits('Rescue 1/Squad 8/Ladder 2/Engine 3/Marine 6').map((u) => u.label)).toEqual(['Engine 3', 'Ladder 2', 'Squad 8', 'Rescue 1', 'Marine 6'])
  })

  it('fixes the source’s misspelt marine battalion', () => {
    expect(parseUnits('Marine Battlion/Marine 6')).toEqual([
      { kind: 'Marine', label: 'Marine 6' },
      { kind: 'Marine Battalion', label: 'Marine Battalion' },
    ])
  })

  it('refuses a unit it does not recognise, so a renamed unit never shows wrongly', () => {
    expect(() => parseUnits('Engine 4/Tower 9')).toThrow(/Tower 9/)
  })
})

describe('groupUnits', () => {
  it('splits units into companies, which answer calls, and commands, which run them', () => {
    const { companies, commands } = groupUnits(parseUnits('Battalion 4/Engine 15/Ladder 18'))
    expect(companies.map((u) => u.label)).toEqual(['Engine 15', 'Ladder 18'])
    expect(commands.map((u) => u.label)).toEqual(['Battalion 4'])
  })
})

describe('commandRank', () => {
  it('is the highest command a firehouse houses: borough command, then division, then battalion', () => {
    expect(commandRank(parseUnits('Engine 9/Ladder 6'))).toBeNull()
    expect(commandRank(parseUnits('Battalion 4/Engine 15/Ladder 18'))).toBe('battalion')
    expect(commandRank(parseUnits('Marine Battlion/Marine 6'))).toBe('battalion')
    expect(commandRank(parseUnits('Division 6/Engine 71/Ladder 55'))).toBe('division')
    expect(commandRank(parseUnits('Brooklyn Borough Command/Division 11/Battalion 31/Engine 207/Ladder 110'))).toBe('borough')
  })
})
