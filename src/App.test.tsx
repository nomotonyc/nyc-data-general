import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { lightTheme } from './theme/tokens'
import { layersOf } from './layers'
import { PHONE_LAYOUT } from './map/config'

// jsdom has no WebGL; the map itself is tested in Milestone 3.
vi.mock('maplibre-gl', () => ({
  Map: class {
    on() { return this }
    once() { return this }
    off() { return this }
    remove() {}
  },
}))

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals())

  for (const storyId of ['demographic', 'medical'] as const) {
    it(`${storyId}: changes layers, areas and markers from the phone settings sheet`, async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === PHONE_LAYOUT, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
      render(<App />)
      if (storyId === 'medical') await userEvent.click(screen.getByRole('button', { name: /03 Medical/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Map settings' }))
      const settings = screen.getByRole('dialog', { name: 'Map settings' })
      for (const layer of layersOf(storyId)) {
        await userEvent.click(within(settings).getByRole('radio', { name: new RegExp(`^${layer.label}`) }))
        for (const geography of ['Division', 'Precinct', 'Battalion', 'Neighborhoods']) {
          const areas = within(settings).getByRole('group', { name: 'Areas' })
          await userEvent.click(within(areas).getByRole('button', { name: geography }))
          expect(within(areas).getByRole('button', { name: geography })).toHaveAttribute('aria-pressed', 'true')
          expect(screen.getByRole('region', { name: 'In focus' })).toHaveTextContent(layer.measure)
        }
      }
      for (const marker of ['Hospitals', 'EMS stations', 'Firehouses']) await userEvent.click(within(settings).getByRole('checkbox', { name: marker }))
      await userEvent.click(within(settings).getByRole('button', { name: 'Done' }))
      expect(screen.queryByRole('dialog', { name: 'Map settings' })).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'In focus' })).toHaveTextContent('New York City')
    })
  }

  it.each(layersOf('medical').flatMap((metric) => [false, true].map((focused) => ({ metric, focused }))))('switches $metric.id from battalions to divisions with all facility markers (borough focused: $focused)', async ({ metric, focused }) => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /03 Medical/ }))
    const controls = screen.getByRole('complementary', { name: 'Map controls' })
    await userEvent.click(within(controls).getByRole('radio', { name: new RegExp(`^${metric.label}`) }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Detail' })).getByRole('button', { name: 'Battalion' }))
    for (const name of ['Firehouses', 'EMS stations', 'Hospitals']) {
      const toggle = within(controls).getByRole('checkbox', { name })
      if (!(toggle as HTMLInputElement).checked) await userEvent.click(toggle)
    }
    if (focused) await userEvent.click(within(controls).getByRole('button', { name: /^Bronx/ }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Areas' })).getByRole('button', { name: 'Division' }))
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'In focus' })).toHaveTextContent(focused ? 'Bronx' : 'New York City')
    for (const name of ['Firehouses', 'EMS stations', 'Hospitals']) {
      expect(within(controls).getByRole('checkbox', { name })).toBeChecked()
    }
    await userEvent.click(screen.getByRole('button', { name: 'Expand trend' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lays out the toolbar, map controls, map and focus panel', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Map controls' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'In focus' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(container.querySelector('.map'))
    expect(screen.getByRole('navigation', { name: 'Geography' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Stories' })).toBeInTheDocument()
    expect(screen.queryByText('Sample values')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'NYC Data Atlas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Where' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Population density/ })).toBeChecked()
    expect(screen.getByRole('region', { name: 'In focus' })).toHaveTextContent('New York City')
  })

  it('colours the page with the current story', async () => {
    const { container } = render(<App />)
    const explorer = container.querySelector<HTMLElement>('.explorer')!
    expect(explorer.style.getPropertyValue('--story-accent')).toBe(lightTheme.story.demographic.accent)
    await userEvent.click(screen.getByRole('button', { name: /Fire/ }))
    expect(explorer.style.getPropertyValue('--story-accent')).toBe(lightTheme.story.fire.accent)
  })

  it('opens a blank yellow Analysis view without the map or explorer controls', async () => {
    const { container } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Analysis/ }))

    const explorer = container.querySelector<HTMLElement>('.explorer')!
    const workspace = screen.getByRole('main', { name: 'Analysis' })
    expect(workspace).toBeEmptyDOMElement()
    expect(explorer.style.getPropertyValue('--story-accent')).toBe(lightTheme.color.analysisAccent)
    expect(explorer.style.getPropertyValue('--analysis-background')).toBe(lightTheme.color.analysisBackground)
    expect(container.querySelector('.map')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Map controls' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'In focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Years' })).not.toBeInTheDocument()
  })

  it('opens the print dialog to save the current view as a PDF', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))

    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })
})
