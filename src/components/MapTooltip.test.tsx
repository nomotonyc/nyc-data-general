import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HoverDetails } from '../map/hover'
import { MapTooltip } from './MapTooltip'

const details: HoverDetails = {
  title: 'Precinct 44',
  subtitle: 'Bronx',
  metric: 'Structural fires, 2025',
  value: '49 fires',
  ranks: [
    { label: 'In the Bronx', rank: '10th', of: 'of 12' },
    { label: 'Citywide', rank: '71st', of: 'of 77' },
  ],
  strip: { dot: 13.5, cityAverage: 42.9, boroughAverage: 21.6, caption: 'Among all 77 precincts', lo: '12', hi: '412' },
  comparisons: ['54% below the city average', '24% below the Bronx average'],
  hint: 'Click to pin this precinct',
}

describe('MapTooltip', () => {
  it('shows the place, the layer, the value, both ranks, both comparisons and the hint', () => {
    render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 10, y: 20 }} area={{ width: 800, height: 600 }} />)
    for (const text of ['Precinct 44', 'Bronx', 'Structural fires, 2025', '49 fires', 'In the Bronx', '10th', 'of 12', 'Citywide', '71st', 'of 77', '54% below the city average', '24% below the Bronx average', 'Click to pin this precinct']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('says what the strip spans and labels its lowest and highest ends', () => {
    render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 0, y: 0 }} area={{ width: 800, height: 600 }} />)
    expect(screen.getByText('Among all 77 precincts')).toBeInTheDocument()
    expect(screen.getByText('Lowest 12')).toBeInTheDocument()
    expect(screen.getByText('Highest 412')).toBeInTheDocument()
  })

  describe('placement', () => {
    const measure = (width: number, height: number) => {
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width)
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height)
    }
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('sits below and to the right of the pointer when there is room', () => {
      measure(288, 330)
      const { container } = render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 100, y: 100 }} area={{ width: 800, height: 600 }} />)
      expect(container.firstElementChild).toHaveStyle({ left: '116px', top: '112px' })
    })

    it('uses its real height, so a tall card near the bottom moves up instead of being cut off', () => {
      measure(288, 330)
      const { container } = render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 100, y: 300 }} area={{ width: 800, height: 600 }} />)
      const top = parseFloat((container.firstElementChild as HTMLElement).style.top)
      expect(top + 330).toBeLessThanOrEqual(600)
    })

    it('uses its real width near the right edge', () => {
      measure(288, 330)
      const { container } = render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 600, y: 100 }} area={{ width: 800, height: 600 }} />)
      const left = parseFloat((container.firstElementChild as HTMLElement).style.left)
      expect(left + 288).toBeLessThanOrEqual(800)
    })
  })

  it('marks the place and both averages on the strip', () => {
    const { container } = render(<MapTooltip details={details} dotColor="#f7b48c" pointer={{ x: 0, y: 0 }} area={{ width: 800, height: 600 }} />)
    expect(container.querySelector('.map-tooltip__dot')).toHaveStyle({ left: '13.5%', backgroundColor: '#f7b48c' })
    expect(container.querySelector('.map-tooltip__tick--city')).toHaveStyle({ left: '42.9%' })
    expect(container.querySelector('.map-tooltip__tick--borough')).toHaveStyle({ left: '21.6%' })
  })

  it('leaves out the borough tick and line for a borough', () => {
    const { container } = render(
      <MapTooltip details={{ ...details, strip: { ...details.strip, boroughAverage: null }, comparisons: ['12% above the average borough'] }} dotColor="#f7b48c" pointer={{ x: 0, y: 0 }} area={{ width: 800, height: 600 }} />,
    )
    expect(container.querySelector('.map-tooltip__tick--borough')).not.toBeInTheDocument()
    expect(screen.queryByText('24% below the Bronx average')).not.toBeInTheDocument()
  })
})
