import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PHONE_LAYOUT } from '../map/config'
import { ExplorerLayout } from './ExplorerLayout'

/** A window whose width matches `query`'s media queries or not. */
function widthMatching(query: string | null) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === query, media: q, addEventListener: () => {}, removeEventListener: () => {} }))
}

/** A window that can be resized across `query`'s width, telling listeners as a browser would. */
function resizableWindow(query: string) {
  let matching = false
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q === query && matching
    },
    media: q,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }))
  return (matches: boolean) =>
    act(() => {
      matching = matches
      for (const fn of listeners) fn()
    })
}

const layout = () =>
  render(<ExplorerLayout accent="#000" toolbar="toolbar" rail="the rail" settings={<p>map settings</p>} map="the map" panel="the panel" />)

describe('ExplorerLayout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the rail beside the map, with no map settings button, on wider screens', () => {
    widthMatching(null)
    layout()
    expect(screen.getByRole('complementary', { name: 'Map controls' })).toHaveTextContent('the rail')
    expect(screen.queryByRole('button', { name: 'Map settings' })).not.toBeInTheDocument()
  })

  it('on a phone, leaves the rail out of the page and puts its settings behind a button on the map', () => {
    widthMatching(PHONE_LAYOUT)
    layout()
    expect(screen.queryByText('the rail')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('button', { name: 'Map settings' }))
    expect(screen.getByRole('complementary', { name: 'In focus' })).toHaveTextContent('the panel')
  })

  it('renders Analysis as a blank workspace without map UI', () => {
    widthMatching(null)
    render(
      <ExplorerLayout
        accent="#8a6500"
        analysis
        analysisBackground="#fff8d8"
        toolbar="toolbar"
        rail="the rail"
        settings="settings"
        map="the map"
        panel="the panel"
      />,
    )
    const workspace = screen.getByRole('main', { name: 'Analysis' })
    const explorer = workspace.closest<HTMLElement>('.explorer')!
    expect(workspace).toBeEmptyDOMElement()
    expect(explorer.style.getPropertyValue('--analysis-background')).toBe('#fff8d8')
    expect(screen.queryByText('the map')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  describe('crossing the phone width, as when a phone turns', () => {
    const withControls = () =>
      render(
        <ExplorerLayout accent="#000" toolbar="toolbar" rail={<button>Precincts</button>} settings={<button>Precincts</button>} map="the map" panel="the panel" />,
      )

    it('moves focus from a control in the rail to Map settings, which now holds it', async () => {
      const resize = resizableWindow(PHONE_LAYOUT)
      withControls()
      screen.getByRole('button', { name: 'Precincts' }).focus()
      resize(true)
      expect(screen.getByRole('button', { name: 'Map settings' })).toHaveFocus()
    })

    it('moves focus from the open settings sheet to the rail, which now holds its controls', async () => {
      const resize = resizableWindow(PHONE_LAYOUT)
      resize(true)
      withControls()
      await userEvent.click(screen.getByRole('button', { name: 'Map settings' }))
      resize(false)
      expect(screen.getByRole('complementary', { name: 'Map controls' })).toHaveFocus()
    })

    it('leaves focus alone when it was somewhere that stays', () => {
      const resize = resizableWindow(PHONE_LAYOUT)
      render(
        <>
          <button>elsewhere</button>
          <ExplorerLayout accent="#000" toolbar="toolbar" rail="the rail" settings="settings" map="the map" panel="the panel" />
        </>,
      )
      screen.getByRole('button', { name: 'elsewhere' }).focus()
      resize(true)
      expect(screen.getByRole('button', { name: 'elsewhere' })).toHaveFocus()
    })
  })
})
