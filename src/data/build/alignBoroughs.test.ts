import { describe, expect, it } from 'vitest'
import boroughsJson from '../../../public/data/nyc-boroughs.geojson?raw'
import precinctsJson from '../../../public/data/nyc-precincts.geojson?raw'
import { alignBoroughs, boroughAt, type BoroughShapes } from './alignBoroughs'
import type { PrecinctShapes } from './openDataPoints'

const precincts = JSON.parse(precinctsJson) as PrecinctShapes
const boroughs = JSON.parse(boroughsJson) as BoroughShapes

const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]

describe('alignBoroughs', () => {
  // Precinct 1 (Manhattan) covers the left square, precinct 40 (Bronx) the right one.
  const shapes: PrecinctShapes = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { precinct: 1 }, geometry: { type: 'MultiPolygon', coordinates: [[square(0, 0, 10)]] } },
      { type: 'Feature', properties: { precinct: 40 }, geometry: { type: 'MultiPolygon', coordinates: [[square(20, 0, 10)]] } },
    ],
  }
  const outlines = (manhattan: number[][][][], bronx: number[][][][]): BoroughShapes => ({
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { borough: 'Manhattan' }, geometry: { type: 'MultiPolygon', coordinates: manhattan } },
      { type: 'Feature', properties: { borough: 'Bronx' }, geometry: { type: 'MultiPolygon', coordinates: bronx } },
    ],
  })

  it('moves an island to the borough whose precinct covers it', () => {
    const aligned = alignBoroughs(outlines([[square(1, 1, 8)], [square(21, 1, 2)]], []), shapes)
    expect(aligned.features[0].geometry.coordinates).toEqual([[square(1, 1, 8)]])
    expect(aligned.features[1].geometry.coordinates).toEqual([[square(21, 1, 2)]])
  })

  it('keeps pieces no precinct covers where they were', () => {
    const aligned = alignBoroughs(outlines([[square(50, 50, 1)]], []), shapes)
    expect(aligned.features[0].geometry.coordinates).toEqual([[square(50, 50, 1)]])
  })
})

describe('the borough outlines on the map', () => {
  it('follow NYPD’s patrol boundaries, as the numbers do', () => {
    expect(boroughAt(boroughs, -73.883, 40.793)).toBe('Queens') // Rikers Island, precinct 114
    expect(boroughAt(boroughs, -73.9505, 40.7625)).toBe('Queens') // Roosevelt Island, precinct 114
    expect(boroughAt(boroughs, -73.9103, 40.8752)).toBe('Bronx') // Marble Hill, precinct 50
    expect(boroughAt(boroughs, -73.9855, 40.758)).toBe('Manhattan')
  })

  it('are already aligned, so rebuilding changes nothing', () => {
    expect(alignBoroughs(boroughs, precincts)).toEqual(boroughs)
  })
})
