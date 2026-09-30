import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOROUGH_BOUNDS, cameraPadding } from '../map/camera'
import { FLY_DURATION, HOVER_DELAY, LAYERS, NYC_BOUNDS, boroughLayers } from '../map/config'
import { cameraEasing } from '../map/easing'
import { renderWithExplorer } from '../test/renderWithExplorer'
import { lightTheme } from '../theme/tokens'
import BaseMap from './BaseMap'
import { MapToggles } from './rail/MapToggles'
import { PlaceList } from './rail/PlaceList'
import { Breadcrumb } from './toolbar/Breadcrumb'
import { StoryTabs } from './toolbar/StoryTabs'

type Handler = (event?: unknown) => void
type Mock = ReturnType<typeof vi.fn>
type FakeMap = {
  options: Record<string, unknown>
  fitBounds: Mock
  remove: Mock
  setFeatureState: Mock
  setLayoutProperty: Mock
  setPaintProperty: Mock
  setFilter: Mock
  queryRenderedFeatures: Mock
  canvas: { style: { cursor: string } }
  fire: (event: string, payload?: unknown) => void
}

const maps = vi.hoisted(() => [] as FakeMap[])

// jsdom has no WebGL, so a stand-in records what BaseMap asks MapLibre to do.
vi.mock('maplibre-gl', async () => {
  const { vi } = await import('vitest')
  return {
    Map: class {
      options: Record<string, unknown>
      handlers: Record<string, Handler[]> = {}
      fitBounds = vi.fn()
      remove = vi.fn()
      addSource = vi.fn()
      addLayer = vi.fn()
      setFeatureState = vi.fn()
      removeFeatureState = vi.fn()
      setLayoutProperty = vi.fn()
      setPaintProperty = vi.fn()
      setFilter = vi.fn()
      queryRenderedFeatures = vi.fn(() => [])
      canvas = { style: { cursor: '' } }
      getCanvas() {
        return this.canvas
      }
      constructor(options: Record<string, unknown>) {
        this.options = options
        maps.push(this as unknown as FakeMap)
      }
      on(event: string, fn: Handler) {
        ;(this.handlers[event] ??= []).push(fn)
        return this
      }
      once(event: string, fn: Handler) {
        return this.on(event, fn)
      }
      off() {
        return this
      }
      fire(event: string, payload?: unknown) {
        for (const fn of this.handlers[event] ?? []) fn(payload)
      }
    },
  }
})

const map = () => maps[maps.length - 1]
const load = () =>
  act(() => {
    map().fire('style.load')
    map().fire('load')
  })
// The colours actually painted (every feature also gets updates that clear its colour).
const fills = () =>
  map()
    .setFeatureState.mock.calls.map(([, state]) => (state as { fill: string | null }).fill)
    .filter((fill): fill is string => fill !== null)

beforeEach(() => {
  maps.length = 0
})

describe('BaseMap', () => {
  it('opens on the whole city', () => {
    renderWithExplorer(<BaseMap />)
    expect(map().options.bounds).toEqual(NYC_BOUNDS)
  })

  it('does not scroll, drag or zoom on its own', () => {
    renderWithExplorer(<BaseMap />)
    expect(map().options).toMatchObject({
      scrollZoom: false,
      dragPan: false,
      dragRotate: false,
      boxZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      touchZoomRotate: false,
    })
  })

  it('leaves the bottom-right corner free for the legend', () => {
    renderWithExplorer(<BaseMap />)
    expect(map().options.attributionControl).toBe(false)
  })

  it('refits the whole city when its area changes size', () => {
    renderWithExplorer(<BaseMap />)
    map().fire('resize')
    expect(map().fitBounds).toHaveBeenCalledWith(NYC_BOUNDS, { padding: cameraPadding(null), animate: false })
  })

  it('removes the map when it unmounts', () => {
    const { unmount } = renderWithExplorer(<BaseMap />)
    unmount()
    expect(map().remove).toHaveBeenCalled()
  })

  it('shows a legend for the layer, years and level', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    expect(screen.getByRole('region', { name: 'Map legend' })).toHaveTextContent('Structural fires, 2025 · by borough')
  })

  it('notes in the legend when density falls back to the latest estimate', () => {
    renderWithExplorer(<BaseMap />)
    expect(screen.getByRole('region', { name: 'Map legend' })).toHaveTextContent('No 2025 estimates yet · showing 2024')
  })

  it('paints the boroughs in the story’s colours once the map has loaded', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    expect(fills()).toHaveLength(0)
    load()
    const boroughFills = map()
      .setFeatureState.mock.calls.filter(([feature]) => (feature as { source: string }).source === 'boroughs')
      .map(([, state]) => (state as { fill: string }).fill)
    expect(boroughFills).toHaveLength(5)
    for (const fill of fills()) expect(lightTheme.story.fire.ramp).toContain(fill)
  })

  it('repaints when the story changes', async () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <StoryTabs />
      </>,
    )
    load()
    map().setFeatureState.mockClear()
    await userEvent.click(screen.getByRole('button', { name: /Medical/ }))
    expect(fills().length).toBeGreaterThan(0)
    for (const fill of fills()) expect(lightTheme.story.medical.ramp).toContain(fill)
  })

  it('hides the borough names when Place labels is unticked', async () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <MapToggles />
      </>,
    )
    load()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Place labels' }))
    const labelCalls = map().setPaintProperty.mock.calls.filter(([id]) => id === LAYERS.boroughLabel)
    expect(labelCalls.at(-1)).toEqual([LAYERS.boroughLabel, 'text-opacity', 0])
  })

  const feature = (layer: string, properties: Record<string, unknown>) => ({ layer: { id: layer }, properties })
  const clickMapOn = (...features: ReturnType<typeof feature>[]) => {
    map().queryRenderedFeatures.mockReturnValueOnce(features)
    act(() => map().fire('click', { point: { x: 1, y: 1 } }))
  }
  const current = () => screen.getByRole('navigation', { name: 'Geography' }).querySelector('[aria-current="location"]')

  it('zooms to a borough clicked on the map', () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <Breadcrumb />
      </>,
    )
    load()
    clickMapOn(feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' }))
    expect(current()).toHaveTextContent('Queens')
    expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Queens, { padding: cameraPadding('Queens'), duration: FLY_DURATION, easing: cameraEasing, linear: true })
  })

  it('pins a precinct clicked inside the focused borough', () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <Breadcrumb />
      </>,
      { borough: 'Queens' },
    )
    load()
    clickMapOn(
      feature(boroughLayers('Queens').precinctFill, { precinct: 114, borough: 'Queens' }),
      feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' }),
    )
    expect(current()).toHaveTextContent('Precinct 114')
    expect(map().setFilter).toHaveBeenLastCalledWith(LAYERS.precinctHighlight, ['in', ['get', 'precinct'], ['literal', [114]]])
  })

  it('zooms when a borough is chosen from the Where list', async () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <PlaceList />
      </>,
    )
    load()
    await userEvent.click(screen.getByRole('button', { name: /^Bronx/ }))
    expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Bronx, { padding: cameraPadding('Bronx'), duration: FLY_DURATION, easing: cameraEasing, linear: true })
  })

  it('offers a way back to the whole city from a focused borough', async () => {
    renderWithExplorer(<BaseMap />, { borough: 'Queens' })
    load()
    await userEvent.click(screen.getByRole('button', { name: 'All of New York City' }))
    expect(map().fitBounds).toHaveBeenLastCalledWith(NYC_BOUNDS, { padding: cameraPadding(null), duration: FLY_DURATION, easing: cameraEasing, linear: true })
    expect(screen.queryByRole('button', { name: 'All of New York City' })).not.toBeInTheDocument()
  })

  it('keeps a focused borough framed when the map area resizes', () => {
    renderWithExplorer(<BaseMap />, { borough: 'Bronx' })
    load()
    map().fire('resize')
    expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Bronx, { padding: cameraPadding('Bronx'), animate: false })
  })

  it('shows a pointer over things that respond to a click', () => {
    renderWithExplorer(<BaseMap />)
    load()
    map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
    act(() => map().fire('mousemove', { point: { x: 1, y: 1 } }))
    expect(map().canvas.style.cursor).toBe('pointer')
    act(() => map().fire('mousemove', { point: { x: 2, y: 2 } }))
    expect(map().canvas.style.cursor).toBe('')
  })

  describe('hover card', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })
    const hoverQueens = () => {
      map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
      act(() => map().fire('mousemove', { point: { x: 100, y: 100 } }))
    }

  it('outlines what the pointer is over straight away', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    expect(map().setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], 'Queens'])
  })

  it('waits a moment before showing the card', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    expect(screen.getByText('Click to focus on Queens')).toBeInTheDocument()
  })

  it('never shows the card for a place the pointer only passed over', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY / 2))
    act(() => map().fire('mouseout'))
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
  })

  it('drops the hover card, outline and pointer when a click moves the view', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
    act(() => map().fire('click', { point: { x: 100, y: 100 } }))
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    expect(map().setFilter).toHaveBeenLastCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
    expect(map().canvas.style.cursor).toBe('')
  })

  it('waits again before showing the card for a place the pointer comes back to', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    act(() => map().fire('mousemove', { point: { x: 300, y: 300 } }))
    hoverQueens()
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    expect(screen.getByText('Click to focus on Queens')).toBeInTheDocument()
  })

  it('clears the hover card and outline when the pointer leaves the map', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    act(() => map().fire('mouseout'))
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    expect(map().setFilter).toHaveBeenLastCalledWith(LAYERS.precinctHover, ['in', ['get', 'precinct'], ['literal', []]])
  })
  })
})
