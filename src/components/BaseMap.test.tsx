import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIT_PADDING, NYC_BOUNDS } from '../map/config'
import BaseMap from './BaseMap'

type Handler = () => void
type FakeMap = {
  options: Record<string, unknown>
  handlers: Record<string, Handler[]>
  fitBounds: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
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

beforeEach(() => {
  maps.length = 0
})

describe('BaseMap', () => {
  it('opens on the whole city', () => {
    render(<BaseMap />)
    expect(map().options.bounds).toEqual(NYC_BOUNDS)
  })

  it('does not scroll, drag or zoom on its own', () => {
    render(<BaseMap />)
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
    render(<BaseMap />)
    expect(map().options.attributionControl).toBe(false)
  })

  it('refits the whole city when its area changes size', () => {
    render(<BaseMap />)
    map().fire('resize')
    expect(map().fitBounds).toHaveBeenCalledWith(NYC_BOUNDS, { padding: FIT_PADDING, animate: false })
  })

  it('removes the map when it unmounts', () => {
    const { unmount } = render(<BaseMap />)
    unmount()
    expect(map().remove).toHaveBeenCalled()
  })
})
