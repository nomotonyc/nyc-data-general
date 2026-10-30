import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { lightTheme } from '../../theme/tokens'
import { Breakdown } from './Breakdown'

describe('Breakdown', () => {
  it('renders a vertical percentage stack with the largest share at the bottom', () => {
    renderWithExplorer(<Breakdown />, { storyId: 'fire', metricId: 'structural-fires', geography: 'battalions' })

    const chart = screen.getByRole('img', { name: 'Building type, stacked by percentage' })
    expect(chart.parentElement?.lastElementChild).toBe(chart)
    const segments = [...chart.querySelectorAll<HTMLElement>('.panel__stack-part')]
    expect(segments).toHaveLength(6)
    expect(segments.map((segment) => Number.parseFloat(segment.style.height))).toEqual([...segments]
      .map((segment) => Number.parseFloat(segment.style.height))
      .sort((a, z) => a - z))

    const shares = screen.getByRole('region', { name: 'Building type' })
    const rows = [...shares.querySelectorAll<HTMLElement>('.panel__part')]
    expect(rows[0]).toHaveTextContent('Vacant or under construction')
    expect(rows.at(-1)).toHaveTextContent('Apartment building')
    expect(rows[0].querySelector('.panel__part-swatch')).toHaveStyle({ background: lightTheme.color.inkFaint })
    expect(rows.at(-1)?.querySelector('.panel__part-swatch')).toHaveStyle({ background: lightTheme.story.fire.ramp[4] })
    expect(shares).toHaveTextContent('Apartment building')
    expect(shares).toHaveTextContent('51%')
    expect(shares).toHaveTextContent('House')
    expect(shares).toHaveTextContent('25%')
  })
})
