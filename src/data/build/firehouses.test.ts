import { describe, expect, it } from 'vitest'
import { FIREHOUSE_NOTES, firehouseFeatures, type FirehouseRow } from './firehouses'
import type { AreaShapes } from './openDataPoints'

const square = (x: number, y: number) => [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]]
const battalions: AreaShapes = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { battalion: 4 }, geometry: { type: 'MultiPolygon', coordinates: [square(-74, 40)] } }],
}
const row = (over: Partial<FirehouseRow> = {}): FirehouseRow => ({
  facilityname: 'Battalion 4/Engine 15/Ladder 18',
  facilityaddress: '25 Pitt Street',
  borough: 'Manhattan',
  nta: 'Lower East Side',
  latitude: '40.5',
  longitude: '-73.5',
  ...over,
})

describe('firehouseFeatures', () => {
  it('makes a point per firehouse with its name, address, neighbourhood, borough and the battalion area it is in', () => {
    const { features } = firehouseFeatures([row()], battalions, {})
    expect(features).toEqual([
      {
        type: 'Feature',
        properties: { id: 1, name: 'Battalion 4/Engine 15/Ladder 18', address: '25 Pitt Street', neighbourhood: 'Lower East Side', borough: 'Manhattan', battalion: 4, command: 'battalion', note: null },
        geometry: { type: 'Point', coordinates: [-73.5, 40.5] },
      },
    ])
  })

  it('records the highest command each firehouse houses, if any', () => {
    const rank = (name: string) => firehouseFeatures([row({ facilityname: name })], battalions, {}).features[0].properties.command
    expect(rank('Engine 6')).toBeNull()
    expect(rank('Queens Borough Command')).toBe('borough')
    expect(rank('Division 13/Squad 270')).toBe('division')
  })

  it('adds a note where the listing is out of date, and fails if the firehouse it names has gone', () => {
    const notes = { 'Engine 9/Ladder 6': 'Temporarily elsewhere' }
    expect(firehouseFeatures([row({ facilityname: 'Engine 9/Ladder 6' })], battalions, notes).features[0].properties.note).toBe('Temporarily elsewhere')
    expect(() => firehouseFeatures([row()], battalions, notes)).toThrow(/Engine 9\/Ladder 6/)
  })

  it('notes that Engine 287, Ladder 136 and Battalion 46 work from temporary quarters while their firehouse is rebuilt', () => {
    expect(FIREHOUSE_NOTES['Battalion 46/Engine 287/Ladder 136']).toMatch(/^As of October 2026.*temporar.*90-26 57th Avenue.*rebuilt/i)
  })

  it('leaves the battalion out for a firehouse outside every battalion area, such as on a pier', () => {
    expect(firehouseFeatures([row({ longitude: '-75.5' })], battalions, {}).features[0].properties.battalion).toBeNull()
  })

  it('numbers firehouses in a stable order, whatever order the source returns them in', () => {
    const a = row({ facilityname: 'Engine 1' })
    const b = row({ facilityname: 'Engine 2', borough: 'Bronx' })
    const ids = (rows: FirehouseRow[]) => firehouseFeatures(rows, battalions, {}).features.map((f) => `${f.properties.id}:${f.properties.name}`)
    expect(ids([a, b])).toEqual(ids([b, a]))
  })

  it('refuses a record without a location or with a borough it does not know', () => {
    expect(() => firehouseFeatures([row({ latitude: undefined })], battalions, {})).toThrow(/Engine 15.*location/)
    expect(() => firehouseFeatures([row({ borough: 'Jersey' })], battalions, {})).toThrow(/Jersey/)
  })

  it('refuses a name with a unit it does not recognise', () => {
    expect(() => firehouseFeatures([row({ facilityname: 'Tower 9' })], battalions, {})).toThrow(/Tower 9/)
  })
})
