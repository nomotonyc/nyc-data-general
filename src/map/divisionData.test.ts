import { describe, expect, it } from 'vitest'
import divisionsJson from '../../public/data/nyc-divisions.geojson?raw'
import labelsJson from '../../public/data/nyc-division-labels.geojson?raw'
import { BATTALIONS, DIVISIONS } from '../domain/geography'
import { LAYERS } from '../layers'
import { layerFileText } from '../test/layerFiles'

type Feature = { properties: { division: number; borough: string }; geometry: { type: string; coordinates: unknown } }
const boundaries: Feature[] = JSON.parse(divisionsJson).features
const labels: Feature[] = JSON.parse(labelsJson).features
const inNyc = ([longitude, latitude]: number[]) => longitude > -74.27 && longitude < -73.69 && latitude > 40.49 && latitude < 40.92

describe('division boundaries', () => {
  it('has one polygon and label for each FDNY division', () => {
    const expected = DIVISIONS.map(({ number, borough }) => ({ division: number, borough }))
    expect(boundaries.map((feature) => feature.properties)).toEqual(expected)
    expect(labels.map((feature) => feature.properties)).toEqual(expected)
    for (const feature of labels) {
      expect(feature.geometry.type).toBe('Point')
      expect(inNyc(feature.geometry.coordinates as number[])).toBe(true)
    }
  })

  it('keeps the browser boundary file compact', () => {
    expect(divisionsJson.length).toBeLessThan(800_000)
  })
})

describe('division datasets', () => {
  const sum = (rows: readonly number[][]) => rows[0].map((_, index) => rows.reduce((total, row) => total + row[index], 0))

  it('contains every division for every metric and preserves exact borough rollup battalions', () => {
    for (const layer of LAYERS) {
      const file = JSON.parse(layerFileText(layer.id, 'divisions'))
      expect(file.geography).toBe('divisions')
      for (const division of DIVISIONS) {
        const expected = sum(division.battalions.map((number) => file.values[`bn${number}`]))
        file.values[`div${division.number}`].forEach((value: number, index: number) => expect(value).toBeCloseTo(expected[index], 3))
      }
      for (const battalion of BATTALIONS) expect(file.values[`bn${battalion.number}`]).toBeDefined()
    }
  })
})
