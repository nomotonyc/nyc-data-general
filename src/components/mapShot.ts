import { createContext } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LegendDetails } from '../map/legend'
import { HOVER_LAYERS } from '../map/paint'

/** The map's pixels as an object URL, at its size on screen. */
export type Shot = { url: string; width: number; height: number }

/** How long a frame may take before the map is taken to be unable to draw (its context lost). */
const SHOT_TIMEOUT = 5000

/**
 * The resolution the map is drawn at for its picture, in pixels per screen pixel: a picture of the
 * whole view may draw it larger than on screen, which at the screen's resolution would be blurry.
 */
export const SHOT_PIXEL_RATIO = 3

/** Per map, shots under way, and what puts it back as it was before the first of them. */
const underway = new WeakMap<MapLibreMap, { count: number; restore: () => void }>()

/**
 * Readies the map for a shot: the outline of what the pointer is over hidden (hidden, not filtered:
 * a filter change shows a frame late), and drawn at SHOT_PIXEL_RATIO. Shots can overlap (the map's
 * picture and the whole view's), so only the first readies it and only the last puts it back:
 * otherwise a later one would note the outlines hidden by an earlier one, and leave them so.
 */
function begin(map: MapLibreMap) {
  const current = underway.get(map)
  if (current) {
    current.count++
    return
  }
  const shown = HOVER_LAYERS.map((id) => [id, map.getLayoutProperty(id, 'visibility') ?? 'visible'] as const)
  const ratio = map.getPixelRatio()
  for (const [id] of shown) map.setLayoutProperty(id, 'visibility', 'none')
  map.setPixelRatio(Math.max(ratio, SHOT_PIXEL_RATIO))
  underway.set(map, {
    count: 1,
    restore: () => {
      for (const [id, visibility] of shown) map.setLayoutProperty(id, 'visibility', visibility)
      map.setPixelRatio(ratio)
    },
  })
}

function end(map: MapLibreMap) {
  const current = underway.get(map)
  if (!current || --current.count > 0) return
  underway.delete(map)
  current.restore()
}

/**
 * The map's pixels (begin readies it). A WebGL canvas keeps its pixels only for the frame that
 * draws them, so a frame is asked for and they're read in it, as MapLibre's 'render' fires;
 * toBlob copies them there and encodes them off the main thread.
 */
export function shoot(map: MapLibreMap): Promise<Shot> {
  begin(map)
  return new Promise<Shot>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The map drew no frame')), SHOT_TIMEOUT)
    map.once('render', () => {
      const canvas = map.getCanvas()
      const { clientWidth: width, clientHeight: height } = canvas
      try {
        canvas.toBlob((blob) => {
          clearTimeout(timer)
          if (blob) resolve({ url: URL.createObjectURL(blob), width, height })
          else reject(new Error('The map gave no pixels'))
        }, 'image/png')
      } catch (e) {
        clearTimeout(timer)
        reject(e)
      }
    })
    map.triggerRepaint()
  }).finally(() => end(map))
}

/** The map's picture with its legend as it was: what a picture of the whole view takes from it. */
export type MapShot = Shot & { legend: LegendDetails }

/**
 * Takes the map's picture for a picture of the whole view (SaveView), elsewhere on the page.
 * BaseMap sets how, once its map has loaded: a map's style takes no changes until then, so
 * taking it before fails.
 */
export type MapShooter = {
  set: (take: (() => Promise<MapShot>) | null) => void
  take: () => Promise<MapShot>
}

export function mapShooter(): MapShooter {
  let current: (() => Promise<MapShot>) | null = null
  return {
    set: (take) => {
      current = take
    },
    take: () => (current ? current() : Promise.reject(new Error('The map hasn’t loaded'))),
  }
}

export const MapShotContext = createContext<MapShooter>(mapShooter())
