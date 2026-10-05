import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { Breakdown } from './Breakdown'
import { Trend } from './Trend'

const fire = { storyId: 'fire' as const, metricId: 'structural-fires' }
const ems = { storyId: 'medical' as const, metricId: 'ambulance-calls' }

describe('Trend', () => {
  it('names the place, the period and the change', () => {
    renderWithExplorer(<Trend />, { ...fire, borough: 'Queens' })
    const trend = screen.getByRole('region', { name: 'Trend · Queens' })
    expect(trend).toHaveTextContent('Monthly · 2025')
    expect(trend).toHaveTextContent(/[+−]\d+\.\d% first to last quarter/)
  })

  it('describes the chart for screen readers', () => {
    renderWithExplorer(<Trend />, { ...fire, borough: 'Queens' })
    expect(screen.getByRole('button', { name: /^Structural fires, monthly, 2025, for Queens, New York City\./ })).toBeInTheDocument()
  })

  it('draws one line per place, with a key when there is more than one', () => {
    const { container } = renderWithExplorer(<Trend />, { geography: 'precincts', ...fire, borough: 'Queens', pinnedArea: '114' })
    expect(container.querySelectorAll('polyline')).toHaveLength(3)
    const key = within(screen.getByRole('list', { name: 'Lines' }))
    expect(key.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Precinct 114', 'Queens', 'New York City'])
    expect(screen.getByText('Average per precinct, so the lines compare fairly')).toBeInTheDocument()
  })

  it('draws the city alone without a key', () => {
    const { container } = renderWithExplorer(<Trend />, fire)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(screen.queryByRole('list', { name: 'Lines' })).not.toBeInTheDocument()
  })

  it('asks for more years when there is only one yearly estimate', () => {
    const { container } = renderWithExplorer(<Trend />)
    expect(screen.getByText(/Choose a wider range to see a trend/)).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})

describe('Breakdown', () => {
  it('lists every part with its share', () => {
    renderWithExplorer(<Breakdown />, ems)
    const section = screen.getByRole('region', { name: 'Call type' })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(7)
    for (const item of items) expect(item.textContent).toMatch(/%$/)
    expect(items[0]).toHaveTextContent('Illness')
  })

  it('draws a stacked bar in the same colours as the list', () => {
    const { container } = renderWithExplorer(<Breakdown />, ems)
    const segments = [...container.querySelectorAll<HTMLElement>('.panel__stack-part')]
    const swatches = [...container.querySelectorAll<HTMLElement>('.panel__part-swatch')]
    expect(segments).toHaveLength(7)
    segments.forEach((s, i) => expect(s.style.background).toBe(swatches[i].style.background))
  })
})
