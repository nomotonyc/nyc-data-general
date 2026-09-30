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
  FIXED_VIEW,
  LABEL_FONT,
  LAYERS,
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
      ...FIXED_VIEW,
      // The legend takes this corner; sources are credited in the panel.
      attributionControl: false,
    })

    map.on('style.load', () => addBoroughs(map, themeRef.current))

    // The whole city always fills the map's area, whatever its size.
    const fitCity = () => map.fitBounds(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
    map.on('resize', fitCity)

    return () => {
      map.off('resize', fitCity)
      map.remove()
    }
  }, [])

  return <div ref={container} className="map" />
}
