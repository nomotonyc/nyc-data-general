import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { lightTheme } from './theme/tokens'

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
})
