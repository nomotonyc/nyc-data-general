import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LegendDetails } from '../map/legend'
import { MapLegend } from './MapLegend'

const details: LegendDetails = {
  title: 'Structural fires, 2025 · by borough',
  steps: ['#fce3d3', '#f7b48c', '#ee8350', '#d4561f', '#9c3610'],
  lo: '2,175',
  hi: '9,766',
  note: null,
}

describe('MapLegend', () => {
  it('shows the title, the lowest and highest values', () => {
    render(<MapLegend details={details} />)
    expect(screen.getByText('Structural fires, 2025 · by borough')).toBeInTheDocument()
    expect(screen.getByText('2,175')).toBeInTheDocument()
    expect(screen.getByText('9,766')).toBeInTheDocument()
  })

  it('draws the five colour steps in order', () => {
    const { container } = render(<MapLegend details={details} />)
    const swatches = [...container.querySelectorAll<HTMLElement>('.map-legend__step')]
    expect(swatches).toHaveLength(5)
    swatches.forEach((s, i) => expect(s).toHaveStyle({ backgroundColor: details.steps[i] }))
  })

  it('shows a note when the years were adjusted', () => {
    render(<MapLegend details={{ ...details, note: 'No 2025 estimates yet · showing 2024' }} />)
    expect(screen.getByText('No 2025 estimates yet · showing 2024')).toBeInTheDocument()
  })

  it('puts the lowest value, the colour steps and the highest value on one row', () => {
    const { container } = render(<MapLegend details={details} />)
    const row = container.querySelector('.map-legend__scale')!
    expect([...row.children].map((c) => c.className)).toEqual(['map-legend__end', 'map-legend__steps', 'map-legend__end'])
  })

  it('is a labelled region screen readers can find', () => {
    render(<MapLegend details={details} />)
    expect(screen.getByRole('region', { name: 'Map legend' })).toBeInTheDocument()
  })
})
