import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIT_PADDING, LAYERS, NYC_BOUNDS } from '../map/config'
import { renderWithExplorer } from '../test/renderWithExplorer'
import { lightTheme } from '../theme/tokens'
import BaseMap from './BaseMap'
import { MapToggles } from './rail/MapToggles'
import { StoryTabs } from './toolbar/StoryTabs'

type Handler = () => void
type Mock = ReturnType<typeof vi.fn>
type FakeMap = {
  options: Record<string, unknown>
  fitBounds: Mock
  remove: Mock
  setFeatureState: Mock
  setLayoutProperty: Mock
  fire: (event: string) => void
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
      fire(event: string) {
        for (const fn of this.handlers[event] ?? []) fn()
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
const fills = () => map().setFeatureState.mock.calls.map(([, state]) => (state as { fill: string }).fill)

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
    expect(map().fitBounds).toHaveBeenCalledWith(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
  })

  it('removes the map when it unmounts', () => {
    const { unmount } = renderWithExplorer(<BaseMap />)
    unmount()
    expect(map().remove).toHaveBeenCalled()
  })

  it('paints the boroughs in the story’s colours once the map has loaded', () => {
    renderWithExplorer(<BaseMap />, { storyId: 'fire', metricId: 'structural-fires' })
    expect(fills()).toHaveLength(0)
    load()
    expect(fills()).toHaveLength(5)
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
    expect(map().setLayoutProperty).toHaveBeenLastCalledWith(LAYERS.boroughLabel, 'visibility', 'none')
  })
})
