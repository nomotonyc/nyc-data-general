import type { LngLatBoundsLike } from 'maplibre-gl'
import type { Borough } from '../domain/geography'
import { NYC_BOUNDS } from './config'

type Bounds = [[number, number], [number, number]]

/** South-west and north-east corners of each borough outline (checked against the GeoJSON by a test). */
export const BOROUGH_BOUNDS: Record<Borough, Bounds> = {
  Manhattan: [[-74.0477, 40.6829], [-73.9066, 40.879]],
  Bronx: [[-73.9336, 40.7854], [-73.7653, 40.9155]],
  Brooklyn: [[-74.0419, 40.5695], [-73.8336, 40.7391]],
  Queens: [[-73.9626, 40.5418], [-73.7, 40.801]],
  'Staten Island': [[-74.2556, 40.4961], [-74.0492, 40.6489]],
}

/** What the camera fits: the focused borough, or the whole city. */
export function cameraTarget(borough: Borough | null): LngLatBoundsLike {
  return borough ? BOROUGH_BOUNDS[borough] : NYC_BOUNDS
}
