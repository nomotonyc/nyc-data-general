import { useEffect, useRef } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import './BaseMap.css'
import { useTheme } from '../theme/context'
import type { Theme } from '../theme/tokens'
import {
  ATTRIBUTION,
  BOROUGHS_URL,
  BOROUGH_LABELS_URL,
  FIT_PADDING,
  LABEL_FONT,
  LAYERS,
  MAX_BOUNDS_SLACK,
  NYC_BOUNDS,
  SOURCES,
} from '../map/config'
import { buildStyle } from '../map/style'

/** Fill, outline and name for each borough. */
function addBoroughs(map: MapLibreMap, theme: Theme) {
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
    paint: { 'fill-color': theme.color.boroughFill },
  })

  // Above the fill, so adjacent boroughs stay distinct.
  map.addLayer({
    id: LAYERS.line,
    type: 'line',
    source: SOURCES.boroughs,
    paint: { 'line-color': theme.color.boroughLine, 'line-width': 1.5 },
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
      'text-color': theme.color.boroughLabel,
      'text-halo-color': theme.color.boroughLabelHalo,
      'text-halo-width': 1.2,
    },
  })
}

/** True when zoomed all the way out. */
function isAtOverview(map: MapLibreMap) {
  return map.getZoom() <= map.getMinZoom() + 0.01
}

/**
 * Sets the zoom floor to the zoom that fits NYC, and maxBounds to what that
 * view spans plus slack. Both depend on container size, so this runs on load
 * and on resize. Measured rather than hardcoded because the required span
 * varies with aspect ratio.
 */
function applyViewConstraints(map: MapLibreMap) {
  const wasAtOverview = isAtOverview(map)
  const before = { center: map.getCenter(), zoom: map.getZoom() }

  // Cleared first; either would distort the measurement.
  map.setMaxBounds(null)
  map.setMinZoom(0)

  map.fitBounds(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
  const overview = map.getBounds()
  map.setMinZoom(map.getZoom())

  const lngSlack = (overview.getEast() - overview.getWest()) * MAX_BOUNDS_SLACK
  const latSlack = (overview.getNorth() - overview.getSouth()) * MAX_BOUNDS_SLACK
  map.setMaxBounds([
    [overview.getWest() - lngSlack, overview.getSouth() - latSlack],
    [overview.getEast() + lngSlack, overview.getNorth() + latSlack],
  ])

  // Keep the user's view if they had zoomed in.
  if (!wasAtOverview) {
    map.jumpTo({ center: before.center, zoom: before.zoom })
  }
}

export default function BaseMap() {
  const container = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  // For the mount effect, which must not re-run on theme change.
  const themeRef = useRef(theme)
  useEffect(() => {
    themeRef.current = theme
  })

  useEffect(() => {
    if (!container.current) return

    const map = new MapLibreMap({
      container: container.current,
      style: buildStyle(themeRef.current),
      bounds: NYC_BOUNDS,
      fitBoundsOptions: { padding: FIT_PADDING },
      dragRotate: false,
    })

    map.on('style.load', () => addBoroughs(map, themeRef.current))

    const onResize = () => applyViewConstraints(map)
    map.once('load', () => applyViewConstraints(map))
    map.on('resize', onResize)

    return () => {
      map.off('resize', onResize)
      map.remove()
    }
  }, [])

  return <div ref={container} className="map" />
}
