import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl'
import './BaseMap.css'
import { BOROUGHS, areaOfPrecinct } from '../domain/geography'
import { useDataset, useExplorerDispatch, useExplorerState } from '../explorer/context'
import { activeMetric } from '../explorer/state'
import { cameraPadding, cameraTarget } from '../map/camera'
import { choropleth } from '../map/choropleth'
import { FIXED_VIEW, FLY_DURATION, HOVER_DELAY, NYC_BOUNDS, boroughLayers } from '../map/config'
import { cameraEasing } from '../map/easing'
import { hoverDetails } from '../map/hover'
import { legendDetails } from '../map/legend'
import { clickAction, hitKind, hoverTarget, type Hit, type Target } from '../map/interaction'
import { mapLayers, mapSources } from '../map/layers'
import { paintHover, paintMap } from '../map/paint'
import { buildStyle } from '../map/style'
import { useTheme } from '../theme/context'
import { MapLegend } from './MapLegend'
import { MapTooltip } from './MapTooltip'

const sameTarget = (a: Target | null, b: Target | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    (a.kind === 'borough' ? b.kind === 'borough' && a.borough === b.borough : b.kind === 'precinct' && a.precinct === b.precinct))

const CLICKABLE = BOROUGHS.flatMap((b) => [boroughLayers(b).precinctFill, boroughLayers(b).boroughFill])

/** Respect a request for less motion: jump instead of flying. */
function flyDuration() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : FLY_DURATION
}

export default function BaseMap() {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  // What the pointer is over changes rarely; where it is changes on every move.
  const [hovered, setHovered] = useState<Target | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0, width: 0, height: 0 })
  // The card waits HOVER_DELAY after the pointer settles on a place.
  const [carded, setCarded] = useState<Target | null>(null)
  const theme = useTheme()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const ds = useDataset()

  // Read by the map's own event handlers, which are registered once.
  const themeRef = useRef(theme)
  const stateRef = useRef(state)
  useEffect(() => {
    themeRef.current = theme
    stateRef.current = state
  })

  useEffect(() => {
    if (!container.current) return

    const map = new MapLibreMap({
      container: container.current,
      style: buildStyle(themeRef.current),
      bounds: NYC_BOUNDS,
      fitBoundsOptions: { padding: cameraPadding(null) },
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

    const hitsAt = (e: MapMouseEvent): Hit[] =>
      map.queryRenderedFeatures(e.point, { layers: CLICKABLE }).flatMap((f) => {
        const kind = hitKind(f.layer.id)
        return kind ? [{ kind, properties: f.properties }] : []
      })
    // The place under the pointer, as last seen by these handlers.
    let lastTarget: Target | null = null
    // Forget the hover: the pointer is over something new once the view moves.
    const clearHover = () => {
      lastTarget = null
      map.getCanvas().style.cursor = ''
      setHovered(null)
      setCarded(null)
    }
    const onClick = (e: MapMouseEvent) => {
      const action = clickAction(stateRef.current, hitsAt(e))
      if (!action) return
      clearHover()
      dispatch(action)
    }
    const onMove = (e: MapMouseEvent) => {
      const target = hoverTarget(stateRef.current, hitsAt(e))
      map.getCanvas().style.cursor = target ? 'pointer' : ''
      if (!sameTarget(lastTarget, target)) {
        lastTarget = target
        setHovered(target)
        setCarded(null) // a new place waits its own pause
      }
      // The map's size too, so the card can keep inside it.
      const el = container.current
      setPointer({ x: e.point.x, y: e.point.y, width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 })
    }
    const onLeave = clearHover
    map.on('click', onClick)
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)

    // Whatever is in view (the city or a focused borough) keeps filling the area.
    const refit = () => {
      const { borough } = stateRef.current
      map.fitBounds(cameraTarget(borough), { padding: cameraPadding(borough), animate: false })
    }
    map.on('resize', refit)

    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
      map.off('mouseout', onLeave)
      map.off('resize', refit)
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [dispatch])

  const { storyId, metricId, borough, detail, yearFrom, yearTo, pinnedPrecinct, showOutlines, showLabels } = state
  const ramp = theme.story[storyId].ramp
  // Only what the colours depend on, so the map toggles don't recompute them.
  const plan = useMemo(
    () => choropleth({ storyId, metricId, borough, detail, yearFrom, yearTo }, ds, ramp),
    [ds, ramp, storyId, metricId, borough, detail, yearFrom, yearTo],
  )
  // Pinning 105 or 116 in dispatch data outlines both.
  const pinned = useMemo(
    () => (pinnedPrecinct === null ? [] : areaOfPrecinct(ds.areas, pinnedPrecinct).precincts),
    [ds, pinnedPrecinct],
  )

  useEffect(() => {
    if (ready && mapRef.current) paintMap(mapRef.current, plan, { outlines: showOutlines, labels: showLabels, pinned })
  }, [ready, plan, showOutlines, showLabels, pinned])

  // Outline what the pointer is over straight away; the card follows after a pause.
  useEffect(() => {
    if (ready && mapRef.current) paintHover(mapRef.current, hovered, ds.areas)
    if (!hovered) return
    const timer = setTimeout(() => setCarded(hovered), HOVER_DELAY)
    return () => clearTimeout(timer)
  }, [ready, hovered, ds])

  // Fly to the focused borough, or back out to the city.
  const flownTo = useRef(borough)
  useEffect(() => {
    if (!ready || !mapRef.current || flownTo.current === borough) return
    flownTo.current = borough
    // linear: a straight glide. MapLibre's default "fly" arcs out and back in, which jolts on short moves.
    mapRef.current.fitBounds(cameraTarget(borough), { padding: cameraPadding(borough), duration: flyDuration(), easing: cameraEasing, linear: true })
  }, [ready, borough])

  // Only once the pause is over for the place the pointer is still on.
  const card = carded && sameTarget(carded, hovered) && hoverDetails(state, ds, carded)

  return (
    <>
      <div ref={container} className="map" />
      <MapLegend
        details={legendDetails(plan, activeMetric(state), ramp, { from: yearFrom, to: yearTo }, {
          from: ds.periods[0].year,
          to: ds.periods[ds.periods.length - 1].year,
        })}
      />
      {card && <MapTooltip details={card} dotColor={ramp[1]} pointer={pointer} area={pointer} />}
      {borough && (
        <button type="button" className="map__back" onClick={() => dispatch({ type: 'focusBorough', borough: null })}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
          All of New York City
        </button>
      )}
    </>
  )
}
