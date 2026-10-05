import { describe, expect, it } from 'vitest'
import type { Firehouse } from '../domain/firehouses'
import { firehouseDetails } from './firehouseHover'

const brooklyn: Firehouse = {
  id: 3,
  name: 'Brooklyn Borough Command/Division 11/Battalion 31/Engine 207/Ladder 110',
  address: '172 Tillary Street',
  neighbourhood: 'DUMBO-Vinegar Hill-Downtown Brooklyn-Boerum Hill',
  borough: 'Brooklyn',
  battalion: 31,
  command: 'borough',
}

describe('firehouseDetails', () => {
  it('leads with where the firehouse is, then what is based there, each unit with its kind', () => {
    expect(firehouseDetails(brooklyn)).toEqual({
      address: '172 Tillary Street',
      place: 'DUMBO-Vinegar Hill-Downtown Brooklyn-Boerum Hill, Brooklyn',
      groups: [
        {
          label: 'Companies',
          units: [
            { kind: 'Engine', label: 'Engine 207' },
            { kind: 'Ladder', label: 'Ladder 110' },
          ],
        },
        {
          label: 'Commands',
          units: [
            { kind: 'Battalion', label: 'Battalion 31' },
            { kind: 'Division', label: 'Division 11' },
            { kind: 'Borough Command', label: 'Brooklyn Borough Command' },
          ],
        },
      ],
      area: 'In Battalion 31',
    })
  })

  it('leaves out an empty group and an unknown battalion area', () => {
    const details = firehouseDetails({ ...brooklyn, name: 'Engine 6', battalion: null })
    expect(details.groups).toEqual([{ label: 'Company', units: [{ kind: 'Engine', label: 'Engine 6' }] }])
    expect(details.area).toBeNull()
  })

  it('names a single command in the singular', () => {
    expect(firehouseDetails({ ...brooklyn, name: 'Battalion 4/Engine 15' }).groups[1].label).toBe('Command')
    expect(firehouseDetails({ ...brooklyn, name: 'Engine 15' }).groups[0].label).toBe('Company')
  })
})
