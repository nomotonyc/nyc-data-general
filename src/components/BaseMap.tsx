import { useEffect, useRef } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ATTRIBUTION,
  BOROUGHS_URL,
  BOROUGH_LABELS_URL,
  COLORS,
  FIT_PADDING,
  LABEL_FONT,
  LAYERS,
  MAX_BOUNDS,
  NYC_BOUNDS,
  SOURCES,
} from '../map/config'
import { buildStyle } from '../map/style'

/** The boroughs are the map: a fill, a separating outline, and borough names. */
function addBoroughs(map: MapLibreMap) {
  map.addSource(SOURCES.boroughs, {
    type: 'geojson',
    data: BOROUGHS_URL,
    attribution: ATTRIBUTION,
  })
  map.addSource(SOURCES.boroughLabels, { type: 'geojson', data: BOROUGH_LABELS_URL })

  map.addLayer({
    id: LAYERS.fill,
    type: 'fill',
    source: SOURCES.boroughs,
    paint: { 'fill-color': COLORS.fill },
  })

  // Over the fill, so neighbouring boroughs read as separate shapes.
  map.addLayer({
    id: LAYERS.line,
    type: 'line',
    source: SOURCES.boroughs,
    paint: { 'line-color': COLORS.line, 'line-width': 1.5 },
  })

  map.addLayer({
    id: LAYERS.label,
    type: 'symbol',
    source: SOURCES.boroughLabels,
    layout: {
      'text-field': ['get', 'borough'],
      'text-font': LABEL_FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 13, 20],
      'text-letter-spacing': 0.14,
      'text-transform': 'uppercase',
    },
    paint: {
      'text-color': COLORS.label,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 1.2,
    },
  })
}

/**
 * Pin the zoom floor to whatever zoom fits NYC in the viewport, so the user can
 * zoom in freely but never out past the city. Recomputed on resize because the
 * fitting zoom depends on container size.
 */
function lockZoomFloorToNyc(map: MapLibreMap) {
  const wasAtOverview = map.getZoom() <= map.getMinZoom() + 0.01

  map.setMinZoom(0)
  const camera = map.cameraForBounds(NYC_BOUNDS, { padding: FIT_PADDING })
  if (camera?.zoom != null) map.setMinZoom(camera.zoom)

  // Re-frame only if the user was viewing the whole city; someone zoomed into a
  // neighbourhood should not be pulled back out by a resize.
  if (wasAtOverview) {
    map.fitBounds(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
  }
}

export default function BaseMap() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const map = new MapLibreMap({
      container: container.current,
      style: buildStyle(),
      bounds: NYC_BOUNDS,
      fitBoundsOptions: { padding: FIT_PADDING },
      maxBounds: MAX_BOUNDS,
      dragRotate: false,
    })

    map.on('style.load', () => addBoroughs(map))

    const onResize = () => lockZoomFloorToNyc(map)
    map.once('load', () => lockZoomFloorToNyc(map))
    map.on('resize', onResize)

    return () => {
      map.off('resize', onResize)
      map.remove()
    }
  }, [])

  return <div ref={container} className="map" />
}
