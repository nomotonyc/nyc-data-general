import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOROUGH_BOUNDS, cameraPadding } from '../map/camera'
import { FADE_DURATION, FLY_DURATION, HOVER_DELAY, LAYERS, NYC_BOUNDS, SOURCES, boroughLayers } from '../map/config'
import { cameraEasing } from '../map/easing'
import { useExplorerDispatch } from '../explorer/context'
import { renderWithExplorer } from '../test/renderWithExplorer'
import { lightTheme } from '../theme/tokens'
import BaseMap from './BaseMap'
import { saveImage } from './saveImage'
import { MapShotContext, SHOT_PIXEL_RATIO, mapShooter } from './mapShot'
import { MapToggles } from './rail/MapToggles'
import { PlaceList } from './rail/PlaceList'
import { Breadcrumb } from './toolbar/Breadcrumb'
import { StoryTabs } from './toolbar/StoryTabs'

type Handler = (event?: unknown) => void
type Mock = ReturnType<typeof vi.fn>
type FakeMap = {
  options: Record<string, unknown>
  triggerRepaint: Mock
  fitBounds: Mock
  resize: Mock
  remove: Mock
  setFeatureState: Mock
  setLayoutProperty: Mock
  setPaintProperty: Mock
  setFilter: Mock
  queryRenderedFeatures: Mock
  canvas: { style: { cursor: string }; focus: Mock; toBlob: Mock; clientWidth: number; clientHeight: number }
  getLayoutProperty: Mock
  setPixelRatio: Mock
  addImage: Mock
  fire: (event: string, payload?: unknown) => void
}

const maps = vi.hoisted(() => [] as FakeMap[])

vi.mock('./saveImage', () => ({ saveImage: vi.fn(async () => 'done') }))

// jsdom has no WebGL, so a stand-in records what BaseMap asks MapLibre to do.
vi.mock('maplibre-gl', async () => {
  const { vi } = await import('vitest')
  return {
    Map: class {
      options: Record<string, unknown>
      handlers: Record<string, Handler[]> = {}
      fitBounds = vi.fn()
      resize = vi.fn()
      remove = vi.fn()
      addSource = vi.fn()
      addLayer = vi.fn()
      addImage = vi.fn()
      setFeatureState = vi.fn()
      removeFeatureState = vi.fn()
      setLayoutProperty = vi.fn()
      setPaintProperty = vi.fn()
      setFilter = vi.fn()
      queryRenderedFeatures = vi.fn(() => [])
      canvas = { style: { cursor: '' }, focus: vi.fn(), toBlob: vi.fn((done: (b: Blob) => void) => done(new Blob(['png']))), clientWidth: 800, clientHeight: 600 }
      getLayoutProperty = vi.fn(() => undefined)
      setPixelRatio = vi.fn()
      getPixelRatio = vi.fn(() => 1)
      // Draws a frame, as MapLibre would: the 'render' event fires while its pixels are there.
      triggerRepaint = vi.fn(() => this.fire('render'))
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
/** The last filter set on one layer (several layers get filters in each paint). */
const lastFilter = (layer: string) => map().setFilter.mock.calls.filter((call: unknown[]) => call[0] === layer).at(-1)?.[1]
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
/** The colour each feature ends on, once any colour tween has finished. */
const settledFills = () => {
  const last = new Map<string, string | null>()
  for (const [target, state] of map().setFeatureState.mock.calls as [{ source: string; id: unknown }, { fill: string | null }][]) {
    last.set(`${target.source}|${target.id}`, state.fill)
  }
  return [...last.values()].filter((fill): fill is string => fill !== null)
}

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

  it('resizes its canvas for print and restores it afterwards', () => {
    renderWithExplorer(<BaseMap />)

    act(() => window.dispatchEvent(new Event('beforeprint')))
    act(() => window.dispatchEvent(new Event('afterprint')))

    expect(map().resize).toHaveBeenCalledTimes(2)
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
    await waitFor(() => {
      expect(settledFills().length).toBeGreaterThan(0)
      for (const fill of settledFills()) expect(lightTheme.story.medical.ramp).toContain(fill)
    })
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
      { geography: 'precincts', borough: 'Queens' },
    )
    load()
    clickMapOn(
      feature(boroughLayers('Queens').precinctFill, { precinct: 114, borough: 'Queens' }),
      feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' }),
    )
    expect(current()).toHaveTextContent('Precinct 114')
    expect(lastFilter(LAYERS.precinctHighlight)).toEqual(['in', ['get', 'precinct'], ['literal', [114]]])
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

  describe('over a firehouse', () => {
    const engine = { id: 9, name: 'Battalion 50/Engine 298/Ladder 127', address: '153-11 Hillside Avenue', neighbourhood: 'Jamaica', borough: 'Queens', battalion: 50, command: 'battalion' }
    const hoverFirehouse = () => {
      map()
        .queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
        .mockReturnValueOnce([feature(boroughLayers('Queens').firehouse, engine)])
      act(() => map().fire('mousemove', { point: { x: 100, y: 100 } }))
    }
    function ToggleFirehouses() {
      const dispatch = useExplorerDispatch()
      return <button onClick={() => dispatch({ type: 'toggleFirehouses' })}>firehouses</button>
    }

    it('shows the firehouse’s card, not the borough’s, once firehouses are on', () => {
      renderWithExplorer(<BaseMap />, { showFirehouses: true })
      load()
      hoverFirehouse()
      expect(map().setFilter).toHaveBeenCalledWith(LAYERS.firehouseHover, ['in', ['get', 'id'], ['literal', [9]]])
      act(() => vi.advanceTimersByTime(HOVER_DELAY))
      expect(screen.getByText('Engine 298')).toBeInTheDocument()
      expect(screen.getByText('153-11 Hillside Avenue')).toBeInTheDocument()
      expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    })

    it('drops the card when firehouses are turned off without moving the pointer', () => {
      renderWithExplorer(
        <>
          <BaseMap />
          <ToggleFirehouses />
        </>,
        { showFirehouses: true },
      )
      load()
      hoverFirehouse()
      act(() => vi.advanceTimersByTime(HOVER_DELAY))
      act(() => screen.getByRole('button', { name: 'firehouses' }).click())
      expect(screen.queryByText('Engine 298')).not.toBeInTheDocument()
    })
  })

  it('drops a hover card when switching to battalions without moving the pointer, instead of crashing', () => {
    function SwitchToBattalions() {
      const dispatch = useExplorerDispatch()
      return <button onClick={() => dispatch({ type: 'setGeography', geography: 'battalions' })}>battalions</button>
    }
    renderWithExplorer(
      <>
        <BaseMap />
        <SwitchToBattalions />
      </>,
      { geography: 'precincts', storyId: 'fire', metricId: 'structural-fires', borough: 'Queens' },
    )
    load()
    map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').precinctFill, { precinct: 114, borough: 'Queens' })])
    act(() => map().fire('mousemove', { point: { x: 100, y: 100 } }))
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    expect(screen.getByText('Precinct 114')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'battalions' }).click())
    expect(screen.queryByText('Precinct 114')).not.toBeInTheDocument()
    expect(lastFilter(LAYERS.battalionHover)).toEqual(['in', ['get', 'battalion'], ['literal', []]])
  })

  it('drops the hover card, outline and pointer when a click moves the view', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
    act(() => map().fire('click', { point: { x: 100, y: 100 } }))
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    expect(lastFilter(LAYERS.precinctHover)).toEqual(['in', ['get', 'precinct'], ['literal', []]])
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

  describe('by touch', () => {
    /** A pointer event from some input, as the window sees it before the map does. */
    const pointer = (type: 'pointerdown' | 'pointermove', pointerType: string) =>
      act(() => {
        const e = new Event(type)
        Object.defineProperty(e, 'pointerType', { value: pointerType })
        window.dispatchEvent(e)
      })
    /** A finger on the screen, as Pointer Events report it before the tap's click. */
    const fingerDown = () => pointer('pointerdown', 'touch')
    const tapQueens = () => {
      fingerDown()
      // A tap also sends the mouse events browsers emulate for it, which must not count as a hover.
      act(() => map().fire('mousemove', { point: { x: 100, y: 100 } }))
      map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
      act(() => map().fire('click', { point: { x: 100, y: 100 } }))
    }

    it('shows the tapped place’s card at once and outlines it, without focusing it', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      expect(screen.getByRole('region', { name: 'Queens' })).toBeInTheDocument()
      expect(map().setFilter).toHaveBeenCalledWith(LAYERS.boroughHover, ['==', ['get', 'borough'], 'Queens'])
      expect(screen.queryByRole('button', { name: /All of New York City/ })).not.toBeInTheDocument()
    })

    it('focuses the borough from the card’s button, and closes the card', async () => {
      vi.useRealTimers()
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      await userEvent.click(screen.getByRole('button', { name: 'Focus on Queens' }))
      expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Queens, expect.anything())
      expect(screen.queryByRole('region', { name: 'Queens' })).not.toBeInTheDocument()
    })

    it('focuses a borough tapped twice', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      tapQueens()
      expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Queens, expect.anything())
      expect(screen.queryByRole('region', { name: 'Queens' })).not.toBeInTheDocument()
    })

    it('closes the card when the view changes from outside the map', async () => {
      vi.useRealTimers()
      renderWithExplorer(
        <>
          <BaseMap />
          <PlaceList />
        </>,
        { storyId: 'fire', metricId: 'structural-fires' },
      )
      load()
      tapQueens()
      await userEvent.click(screen.getByRole('button', { name: /^Brooklyn/ }))
      expect(screen.queryByRole('region', { name: 'Queens' })).not.toBeInTheDocument()
    })

    it('treats a pen as a finger: a tap shows the card first', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      pointer('pointerdown', 'pen')
      map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
      act(() => map().fire('click', { point: { x: 100, y: 100 } }))
      expect(screen.getByRole('region', { name: 'Queens' })).toBeInTheDocument()
    })

    it('forgets a tap’s selection once a mouse moves, so the next tap shows the card again', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      pointer('pointermove', 'mouse')
      act(() => map().fire('mousemove', { point: { x: 300, y: 300 } }))
      tapQueens()
      expect(screen.getByRole('region', { name: 'Queens' })).toBeInTheDocument()
      expect(map().fitBounds).not.toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Queens, expect.anything())
    })

    it('takes focus when it opens, so a screen reader reads it, without scrolling the page', () => {
      const focus = vi.spyOn(HTMLElement.prototype, 'focus')
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      expect(screen.getByRole('region', { name: 'Queens' })).toHaveFocus()
      expect(focus).toHaveBeenCalledWith({ preventScroll: true })
      focus.mockRestore()
    })

    it('closes on Escape, giving focus back to the map', async () => {
      vi.useRealTimers()
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('region', { name: 'Queens' })).not.toBeInTheDocument()
      expect(map().canvas.focus).toHaveBeenCalled()
    })

    it('gives focus back to the map when closed with its button', async () => {
      vi.useRealTimers()
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      await userEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(map().canvas.focus).toHaveBeenCalled()
    })

    it('opens on the side of the map away from the tap, so the place tapped stays in view', () => {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      const tapAt = (x: number) => {
        fingerDown()
        map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').boroughFill, { borough: 'Queens' })])
        act(() => map().fire('click', { point: { x, y: 100 } }))
      }
      tapAt(100)
      expect(screen.getByRole('region', { name: 'Queens' }).parentElement).toHaveClass('map-sheet--right')
      act(() => map().fire('click', { point: { x: 5, y: 5 } }))
      tapAt(700)
      expect(screen.getByRole('region', { name: 'Queens' }).parentElement).toHaveClass('map-sheet--left')
      vi.restoreAllMocks()
    })

    describe('on an area', () => {
      const tapPrecinct = () => {
        fingerDown()
        map().queryRenderedFeatures.mockReturnValueOnce([feature(boroughLayers('Queens').precinctFill, { precinct: 114, borough: 'Queens' })])
        act(() => map().fire('click', { point: { x: 100, y: 100 } }))
      }
      const inQueens = { geography: 'precincts' as const, storyId: 'fire' as const, metricId: 'structural-fires', borough: 'Queens' as const }

      it('keeps the card open when its button pins the area, offering to unpin it, with focus on the button', async () => {
        vi.useRealTimers()
        renderWithExplorer(<BaseMap />, inQueens)
        load()
        tapPrecinct()
        await userEvent.click(screen.getByRole('button', { name: 'Pin this precinct' }))
        expect(screen.getByRole('region', { name: 'Precinct 114' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Unpin this precinct' })).toHaveFocus()
        await userEvent.click(screen.getByRole('button', { name: 'Unpin this precinct' }))
        expect(screen.getByRole('button', { name: 'Pin this precinct' })).toBeInTheDocument()
      })

      it('keeps the card open when pinning from the city view zooms into the area’s borough', async () => {
        vi.useRealTimers()
        renderWithExplorer(<BaseMap />, { ...inQueens, borough: null, detail: 'area' })
        load()
        tapPrecinct()
        await userEvent.click(screen.getByRole('button', { name: 'Pin this precinct' }))
        expect(map().fitBounds).toHaveBeenLastCalledWith(BOROUGH_BOUNDS.Queens, expect.anything())
        expect(screen.getByRole('button', { name: 'Unpin this precinct' })).toBeInTheDocument()
      })

      it('keeps the card open when a double tap pins the area', () => {
        renderWithExplorer(<BaseMap />, inQueens)
        load()
        tapPrecinct()
        tapPrecinct()
        expect(screen.getByRole('region', { name: 'Precinct 114' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Unpin this precinct' })).toBeInTheDocument()
      })
    })

    it('keeps the card when the finger leaves the map to reach its button', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      act(() => map().fire('mouseout'))
      expect(screen.getByRole('region', { name: 'Queens' })).toBeInTheDocument()
    })

    it('closes the card on a tap on the water', () => {
      renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
      load()
      tapQueens()
      act(() => map().fire('click', { point: { x: 5, y: 5 } }))
      expect(screen.queryByRole('region', { name: 'Queens' })).not.toBeInTheDocument()
    })

    it('reaches further for firehouse markers than a mouse does, since a fingertip is wide', () => {
      renderWithExplorer(<BaseMap />, { showFirehouses: true })
      load()
      fingerDown()
      act(() => map().fire('click', { point: { x: 100, y: 100 } }))
      const boxes = map().queryRenderedFeatures.mock.calls.map(([where]) => where).filter(Array.isArray) as [[number, number], [number, number]][]
      expect(boxes.at(-1)![1][0] - 100).toBeGreaterThanOrEqual(16)
    })
  })

  it('clears the hover card and outline when the pointer leaves the map', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    load()
    hoverQueens()
    act(() => vi.advanceTimersByTime(HOVER_DELAY))
    act(() => map().fire('mouseout'))
    expect(screen.queryByText('Click to focus on Queens')).not.toBeInTheDocument()
    expect(lastFilter(LAYERS.precinctHover)).toEqual(['in', ['get', 'precinct'], ['literal', []]])
  })
  })
})

describe('saving the map as a picture', () => {
  const fire = { storyId: 'fire' as const, metricId: 'structural-fires', geography: 'precincts' as const, yearFrom: 2025 as const, yearTo: 2025 as const }
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:map'), revokeObjectURL: vi.fn() })
  })
  const saveButton = () => screen.getByRole('button', { name: 'Save image: Map' })

  it('offers to once the map has loaded, as its style takes no changes before', () => {
    renderWithExplorer(<BaseMap />, fire)
    expect(screen.queryByRole('button', { name: 'Save image: Map' })).not.toBeInTheDocument()
    load()
    expect(saveButton()).toBeInTheDocument()
  })

  it('draws the map, with what it shows above it, its legend, and whose data below it', async () => {
    renderWithExplorer(<BaseMap />, fire)
    load()
    let picture: { img: string | null; text: string; legend: boolean; width: string } | null = null
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      picture = { img: node.querySelector('img')?.getAttribute('src') ?? null, text: node.textContent ?? '', legend: !!node.querySelector('.map-legend'), width: node.style.width }
      return 'done'
    })
    await userEvent.click(saveButton())
    expect(picture).toMatchObject({ img: 'blob:map', legend: true, width: '800px' })
    expect(picture!.text).toMatch(/^Structural fires by borough · New York City · 2025/)
    expect(picture!.text).toMatch(/Data: .*NYC Department of City Planning/)
    expect(vi.mocked(saveImage).mock.calls.at(-1)![1].name).toBe('map-structural-fires-by-borough-new-york-city-2025')
  })

  it('reads the map’s pixels in the frame that draws them, which a WebGL canvas keeps no longer', async () => {
    renderWithExplorer(<BaseMap />, fire)
    load()
    const read: number[] = []
    map().canvas.toBlob.mockImplementation((done: (b: Blob) => void) => {
      read.push(map().triggerRepaint.mock.calls.length)
      done(new Blob(['png']))
    })
    await userEvent.click(saveButton())
    expect(read).toEqual([1])
  })

  it('hides the outline of what the pointer is over for the shot, then puts it back', async () => {
    renderWithExplorer(<BaseMap />, fire)
    load()
    const during: unknown[][] = []
    map().canvas.toBlob.mockImplementation((done: (b: Blob) => void) => {
      during.push(map().setLayoutProperty.mock.calls.filter(([id]) => id === LAYERS.boroughHover).at(-1)!)
      done(new Blob(['png']))
    })
    await userEvent.click(saveButton())
    expect(during).toEqual([[LAYERS.boroughHover, 'visibility', 'none']])
    expect(map().setLayoutProperty.mock.calls.filter(([id]) => id === LAYERS.boroughHover).at(-1)).toEqual([LAYERS.boroughHover, 'visibility', 'visible'])
  })

  it('lets the whole view take the map’s picture, with its legend, once loaded and not before', async () => {
    const shooter = mapShooter()
    renderWithExplorer(
      <MapShotContext.Provider value={shooter}>
        <BaseMap />
      </MapShotContext.Provider>,
      fire,
    )
    await expect(shooter.take()).rejects.toThrow()
    load()
    await expect(shooter.take()).resolves.toMatchObject({ url: 'blob:map', width: 800, height: 600, legend: { title: 'Structural fires, 2025 · by borough' } })
  })

  it('draws the map at a higher resolution for its picture, then goes back', async () => {
    renderWithExplorer(<BaseMap />, fire)
    load()
    let during = 0
    map().canvas.toBlob.mockImplementation((done: (b: Blob) => void) => {
      during = map().setPixelRatio.mock.calls.at(-1)![0]
      done(new Blob(['png']))
    })
    await userEvent.click(saveButton())
    expect(during).toBe(SHOT_PIXEL_RATIO)
    expect(map().setPixelRatio).toHaveBeenLastCalledWith(1)
  })

  it('puts the outlines back as they were when two pictures are taken at once', async () => {
    const shooter = mapShooter()
    renderWithExplorer(
      <MapShotContext.Provider value={shooter}>
        <BaseMap />
      </MapShotContext.Provider>,
      fire,
    )
    load()
    // Visibility as MapLibre keeps it: whatever was last set.
    const visibility = new Map<string, string>()
    map().setLayoutProperty.mockImplementation((id: string, _: string, v: string) => void visibility.set(id, v))
    map().getLayoutProperty.mockImplementation((id: string) => visibility.get(id))
    await Promise.all([shooter.take(), shooter.take()])
    expect(visibility.get(LAYERS.boroughHover)).toBe('visible')
  })

  it('keeps the picture a save is taking when pressed again mid-save, then takes it off the page', async () => {
    renderWithExplorer(<BaseMap />, fire)
    load()
    let finish = () => {}
    vi.mocked(saveImage).mockImplementationOnce(() => new Promise((r) => (finish = () => r('done'))))
    await userEvent.click(saveButton())
    await userEvent.click(screen.getByRole('button', { name: 'Saving…: Map' }))
    expect(document.querySelector('.picture-stage img')).toBeInTheDocument()
    await act(async () => finish())
    expect(document.querySelector('.picture-stage')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:map')
  })
})

describe('changing story', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] }))
  afterEach(() => vi.useRealTimers())

  function SwitchStory() {
    const dispatch = useExplorerDispatch()
    return <button onClick={() => dispatch({ type: 'selectStory', storyId: 'fire' })}>fire</button>
  }
  const queensFills = () =>
    (map().setFeatureState.mock.calls as [{ source: string; id: unknown }, { fill: string | null }][])
      .filter(([target]) => target.source === SOURCES.boroughs && target.id === 'Queens')
      .map(([, s]) => s.fill)

  it('eases borough colours from the old story’s to the new one’s instead of snapping', () => {
    renderWithExplorer(
      <>
        <BaseMap />
        <SwitchStory />
      </>,
    )
    load()
    act(() => vi.advanceTimersByTime(1000))
    const before = queensFills().at(-1)
    act(() => screen.getByRole('button', { name: 'fire' }).click())
    act(() => vi.advanceTimersByTime(FADE_DURATION / 2))
    const midway = queensFills().at(-1)
    act(() => vi.advanceTimersByTime(FADE_DURATION))
    const after = queensFills().at(-1)
    expect(after).not.toBe(before)
    expect(midway).not.toBe(before)
    expect(midway).not.toBe(after)
  })
})
