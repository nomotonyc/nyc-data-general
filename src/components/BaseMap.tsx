import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import './BaseMap.css'
import { useDataset, useExplorerState } from '../explorer/context'
import { choropleth } from '../map/choropleth'
import { FIT_PADDING, FIXED_VIEW, NYC_BOUNDS } from '../map/config'
import { mapLayers, mapSources } from '../map/layers'
import { paintMap } from '../map/paint'
import { buildStyle } from '../map/style'
import { useTheme } from '../theme/context'

export default function BaseMap() {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const theme = useTheme()
  const state = useExplorerState()
  const ds = useDataset()

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
    mapRef.current = map

    map.on('style.load', () => {
      for (const [id, source] of Object.entries(mapSources())) map.addSource(id, source)
      for (const layer of mapLayers(themeRef.current)) map.addLayer(layer)
    })
    map.once('load', () => setReady(true))

    // The whole city always fills the map's area, whatever its size.
    const fitCity = () => map.fitBounds(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
    map.on('resize', fitCity)

    return () => {
      map.off('resize', fitCity)
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  const { storyId, metricId, borough, detail, yearFrom, yearTo } = state
  const ramp = theme.story[storyId].ramp
  // Only what the colours depend on, so the map toggles don't recompute them.
  const plan = useMemo(
    () => choropleth({ storyId, metricId, borough, detail, yearFrom, yearTo }, ds, ramp),
    [ds, ramp, storyId, metricId, borough, detail, yearFrom, yearTo],
  )

  useEffect(() => {
    if (ready && mapRef.current) {
      paintMap(mapRef.current, plan, { outlines: state.showOutlines, labels: state.showLabels })
    }
  }, [ready, plan, state.showOutlines, state.showLabels])

  return <div ref={container} className="map" />
}
