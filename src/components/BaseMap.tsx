import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap, type MapMouseEvent, type PointLike } from 'maplibre-gl'
import './BaseMap.css'
import './MapControl.css'
import { BOROUGHS, GEOGRAPHIES, areaById } from '../domain/geography'
import { useDataset, useExplorerDispatch, useExplorerState } from '../explorer/context'
import { activeMetric } from '../explorer/state'
import { cameraPadding, cameraTarget } from '../map/camera'
import { choropleth } from '../map/choropleth'
import { FADE_DURATION, FIXED_VIEW, FLY_DURATION, HOVER_DELAY, NYC_BOUNDS, STACKED_LAYOUT, areaLayers, boroughLayers } from '../map/config'
import { cameraEasing } from '../map/easing'
import { hoverDetails } from '../map/hover'
import { legendDetails } from '../map/legend'
import { cardAction, clickAction, hitKind, hoverTarget, liveTarget, nearestFirst, sameTarget, tapResult, type Hit, type Target } from '../map/interaction'
import { mapLayers, mapSources } from '../map/layers'
import { fillsAt, planFills } from '../map/fillTween'
import { paintHover, paintMap } from '../map/paint'
import { buildStyle } from '../map/style'
import { useTheme } from '../theme/context'
import { firehouseDetails } from '../map/firehouseHover'
import { FirehouseTooltip } from './FirehouseTooltip'
import { MapLegend } from './MapLegend'
import { MapTooltip } from './MapTooltip'

const CLICKABLE = BOROUGHS.flatMap((b) => [boroughLayers(b).boroughFill, ...GEOGRAPHIES.map((g) => areaLayers(b, g).fill)])
const FIREHOUSES = BOROUGHS.map((b) => boroughLayers(b).firehouse)
/** How far beyond a marker's edge the pointer still counts as over it, in pixels: markers are small, a fingertip is not. */
const MARKER_REACH = { mouse: 6, touch: 20 }

/** The camera's margin for what's in view, given whether the columns are stacked now. */
function padding(borough: Parameters<typeof cameraPadding>[0]) {
  return cameraPadding(borough, { stacked: window.matchMedia?.(STACKED_LAYOUT).matches ?? false })
}

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
  // Touch has no hover: a tap selects a place, and its card opens at once as a sheet.
  const [tapped, setTapped] = useState(false)
  // The place under the pointer, as last seen by the map's handlers.
  const lastTarget = useRef<Target | null>(null)
  // The place a tap selected, which a second tap acts on.
  const selected = useRef<Target | null>(null)
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

  // Forget the hover or selection: the pointer is over something new once the view moves.
  // Focus in a tapped card goes back to the map, rather than to the top of the page.
  const clearHover = useCallback(() => {
    if (document.activeElement?.closest('.map-sheet')) mapRef.current?.getCanvas().focus({ preventScroll: true })
    lastTarget.current = null
    selected.current = null
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = ''
    setHovered(null)
    setCarded(null)
    setTapped(false)
  }, [])

  useEffect(() => {
    if (!container.current) return

    const map = new MapLibreMap({
      container: container.current,
      style: buildStyle(themeRef.current),
      bounds: NYC_BOUNDS,
      fitBoundsOptions: { padding: padding(null) },
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

    // Which input the last pointer event came from, per event, so a touchscreen laptop gets both:
    // a tap's emulated mouse events must not act as hovers. A pen counts as a finger: most can't hover.
    let touch = false
    const notePointer = (e: PointerEvent) => {
      touch = e.pointerType !== 'mouse'
    }
    window.addEventListener('pointerdown', notePointer, { capture: true, passive: true })
    window.addEventListener('pointermove', notePointer, { capture: true, passive: true })

    const hitsAt = (e: MapMouseEvent): Hit[] => {
      const places = map.queryRenderedFeatures(e.point, { layers: CLICKABLE })
      const { x, y } = e.point
      const r = touch ? MARKER_REACH.touch : MARKER_REACH.mouse
      const reach: [PointLike, PointLike] = [
        [x - r, y - r],
        [x + r, y + r],
      ]
      const markers = stateRef.current.showFirehouses
        ? nearestFirst(map.queryRenderedFeatures(reach, { layers: FIREHOUSES }), e.point, (lngLat) => map.project(lngLat))
        : []
      return [...markers, ...places].flatMap((f) => {
        const kind = hitKind(f.layer.id)
        return kind ? [{ kind, properties: f.properties }] : []
      })
    }
    const onTap = (e: MapMouseEvent) => {
      const { select, action } = tapResult(stateRef.current, hitsAt(e), selected.current)
      if (action) dispatch(action)
      if (!select) return clearHover()
      selected.current = select
      lastTarget.current = select
      // Where the tap was, so the card can open on the other side of the map.
      const el = container.current
      setPointer({ x: e.point.x, y: e.point.y, width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 })
      setHovered(select)
      setCarded(select)
      setTapped(true)
    }
    const onClick = (e: MapMouseEvent) => {
      if (touch) return onTap(e)
      const action = clickAction(stateRef.current, hitsAt(e))
      if (!action) return
      clearHover()
      dispatch(action)
    }
    const onMove = (e: MapMouseEvent) => {
      if (touch) return
      // A mouse moving ends a tap's selection: the place under it waits for its hover card.
      if (selected.current) {
        selected.current = null
        lastTarget.current = null
        setTapped(false)
      }
      const target = hoverTarget(stateRef.current, hitsAt(e))
      map.getCanvas().style.cursor = target ? 'pointer' : ''
      if (!sameTarget(lastTarget.current, target)) {
        lastTarget.current = target
        setHovered(target)
        setCarded(null) // a new place waits its own pause
        setTapped(false)
      }
      // The map's size too, so the card can keep inside it.
      const el = container.current
      setPointer({ x: e.point.x, y: e.point.y, width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 })
    }
    // A finger leaving the map is on its way to the sheet's buttons, so a tapped card stays.
    const onLeave = () => {
      if (!touch) clearHover()
    }
    map.on('click', onClick)
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)

    // Whatever is in view (the city or a focused borough) keeps filling the area.
    const refit = () => {
      const { borough } = stateRef.current
      map.fitBounds(cameraTarget(borough), { padding: padding(borough), animate: false })
    }
    map.on('resize', refit)

    return () => {
      window.removeEventListener('pointerdown', notePointer, { capture: true })
      window.removeEventListener('pointermove', notePointer, { capture: true })
      map.off('click', onClick)
      map.off('mousemove', onMove)
      map.off('mouseout', onLeave)
      map.off('resize', refit)
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [dispatch, clearHover])

  const { storyId, metricId, borough, detail, yearFrom, yearTo, pinnedArea, geography, showOutlines, showLabels, showFirehouses } = state
  const ramp = theme.story[storyId].ramp
  // Only what the colours depend on, so the map toggles don't recompute them.
  const plan = useMemo(
    () => choropleth({ storyId, metricId, borough, detail, yearFrom, yearTo }, ds, ramp),
    [ds, ramp, storyId, metricId, borough, detail, yearFrom, yearTo],
  )
  const pinned = useMemo(() => (pinnedArea === null ? [] : [areaById(ds.areas, pinnedArea).number]), [ds, pinnedArea])

  useEffect(() => {
    if (ready && mapRef.current) {
      paintMap(mapRef.current, plan, { outlines: showOutlines, labels: showLabels, firehouses: showFirehouses, pinned }, { fills: false })
    }
  }, [ready, plan, showOutlines, showLabels, showFirehouses, pinned])

  // Colours ease to each new plan (a story, layer or year change) over the fade duration, as
  // everything else on the map does; MapLibre can't animate per-feature colours, so it's drawn
  // frame by frame. A change mid-way starts from the colours on screen.
  const shownFills = useRef(new Map<string, string | null>())
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const target = planFills(plan)
    const from = new Map(shownFills.current)
    const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : FADE_DURATION
    const start = performance.now()
    let frame = 0
    const step = () => {
      const t = duration === 0 ? 1 : Math.min(1, (performance.now() - start) / duration)
      for (const f of fillsAt(from, target, cameraEasing(t))) {
        map.setFeatureState({ source: f.source, id: f.id }, { fill: f.fill })
        shownFills.current.set(`${f.source}|${f.id}`, f.fill)
      }
      if (t < 1) frame = requestAnimationFrame(step)
    }
    step()
    return () => cancelAnimationFrame(frame)
  }, [ready, plan])

  // A hover from before a precincts/battalions switch names an area the new geography doesn't have;
  // one over a firehouse ends when firehouses are turned off.
  const live = liveTarget(hovered, geography, showFirehouses)

  // Outline what the pointer is over straight away; the card follows after a pause.
  useEffect(() => {
    if (ready && mapRef.current) paintHover(mapRef.current, live, geography)
    if (!live) return
    const timer = setTimeout(() => setCarded(live), HOVER_DELAY)
    return () => clearTimeout(timer)
  }, [ready, live, geography])

  // A tapped card describes the view it was opened in; one changed from outside the map (the
  // rail, the panel, the breadcrumb) closes it. A mouse's next move would; a finger never moves.
  // Pinning from the city view zooms into the area's borough, but the pinned area's card stays.
  const view = `${storyId}|${metricId}|${borough}|${detail}|${geography}|${showFirehouses}`
  const shownIn = useRef(view)
  useEffect(() => {
    if (shownIn.current === view) return
    shownIn.current = view
    const pinnedHere = selected.current?.kind === 'area' && selected.current.id === stateRef.current.pinnedArea
    if (selected.current && !pinnedHere) clearHover()
  }, [view, clearHover])

  // Fly to the focused borough, or back out to the city.
  const flownTo = useRef(borough)
  useEffect(() => {
    if (!ready || !mapRef.current || flownTo.current === borough) return
    flownTo.current = borough
    // linear: a straight glide. MapLibre's default "fly" arcs out and back in, which jolts on short moves.
    mapRef.current.fitBounds(cameraTarget(borough), { padding: padding(borough), duration: flyDuration(), easing: cameraEasing, linear: true })
  }, [ready, borough])

  // Only once the pause is over for the place the pointer is still on.
  const settled = carded && live && sameTarget(carded, live) ? carded : null

  // The card for the settled place: beside the pointer, or opened by a tap as a sheet whose
  // button does what a click on the place would. One per place, so a new place's card opens afresh.
  const at = { pointer, area: pointer }
  let card = null
  if (settled?.kind === 'firehouse') {
    const props = { key: `firehouse-${settled.id}`, details: firehouseDetails(settled.firehouse), palette: theme.story[storyId] }
    card = tapped ? <FirehouseTooltip {...props} sheet={{ onClose: clearHover }} /> : <FirehouseTooltip {...props} {...at} />
  } else if (settled) {
    const props = { key: settled.kind === 'borough' ? settled.borough : settled.id, details: hoverDetails(state, ds, settled), dotColor: ramp[1] }
    // Focusing a borough goes into it and closes the card; a pin or unpin keeps it open.
    const onAction = () => {
      const action = cardAction(settled, state.pinnedArea)
      if (action.type === 'focusBorough') clearHover()
      dispatch(action)
    }
    card = tapped ? <MapTooltip {...props} sheet={{ onAction, onClose: clearHover }} /> : <MapTooltip {...props} {...at} />
  }

  return (
    <>
      <div className="map-frame">
        <div ref={container} className="map" />
        {!tapped && card}
        {borough && (
          <button type="button" className="map-control map__back" onClick={() => dispatch({ type: 'focusBorough', borough: null })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M10 3L5 8l5 5" />
            </svg>
            <span>
              <span className="map__back-all">All of</span> New York City
            </span>
          </button>
        )}
      </div>
      {/* Opened by a tap: beside the columns, over the map on the side away from the tap, so the
          place tapped stays in view; under the map once they stack. */}
      {tapped && card && <div className={`map-sheet map-sheet--${pointer.x < pointer.width / 2 ? 'right' : 'left'}`}>{card}</div>}
      <MapLegend
        details={legendDetails(plan, activeMetric(state), ramp, { from: yearFrom, to: yearTo }, {
          from: ds.periods[0].year,
          to: ds.periods[ds.periods.length - 1].year,
        }, ds.placement)}
      />
    </>
  )
}
