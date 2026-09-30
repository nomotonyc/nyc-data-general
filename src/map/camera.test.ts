import { describe, expect, it } from 'vitest'
import boroughsJson from '../../public/data/nyc-boroughs.geojson?raw'
import { BOROUGHS } from '../domain/geography'
import { BOROUGH_BOUNDS, cameraPadding, cameraTarget } from './camera'
import { NYC_BOUNDS } from './config'

type Feature = { properties: { borough: string }; geometry: { coordinates: number[][][][] } }
const outlines: Feature[] = JSON.parse(boroughsJson).features

describe('BOROUGH_BOUNDS', () => {
  it.each(BOROUGHS)('matches the outline of %s', (borough) => {
    const points = outlines.find((f) => f.properties.borough === borough)!.geometry.coordinates.flat(2)
    const lngs = points.map(([lng]) => lng)
    const lats = points.map(([, lat]) => lat)
    const [[w, s], [e, n]] = BOROUGH_BOUNDS[borough]
    expect(w).toBeCloseTo(Math.min(...lngs), 3)
    expect(s).toBeCloseTo(Math.min(...lats), 3)
    expect(e).toBeCloseTo(Math.max(...lngs), 3)
    expect(n).toBeCloseTo(Math.max(...lats), 3)
  })
})

describe('cameraTarget', () => {
  it('fits the focused borough', () => {
    expect(cameraTarget('Queens')).toBe(BOROUGH_BOUNDS.Queens)
  })

  it('fits the whole city otherwise', () => {
    expect(cameraTarget(null)).toBe(NYC_BOUNDS)
  })
})

describe('cameraPadding', () => {
  it('gives the whole city an even margin, so it draws as large as it can', () => {
    const p = cameraPadding(null)
    expect(p.bottom).toBe(p.top)
    expect(p.left).toBe(p.top)
    expect(p.right).toBe(p.top)
  })

  it('keeps extra room at the bottom for a focused borough, whose land can reach the legend’s corner', () => {
    expect(cameraPadding('Queens').bottom).toBeGreaterThan(cameraPadding('Queens').top)
    expect(cameraPadding('Queens').bottom).toBeGreaterThan(cameraPadding(null).bottom)
    // The legend with its note row is about 73px tall, 16px up from the edge.
    expect(cameraPadding('Queens').bottom).toBeGreaterThanOrEqual(96)
  })
})
