import { getLayer } from '../../layers'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getDataset } from '../../data/load'
import { placeValues } from '../../data/places'
import { formatCompact, formatCount } from '../../domain/format'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { lightTheme } from '../../theme/tokens'
import { PlaceList } from './PlaceList'

const place = (name: RegExp) => screen.getByRole('button', { name })

describe('PlaceList', () => {
  it('lists the city and the five boroughs', () => {
    renderWithExplorer(<PlaceList />)
    expect(screen.getAllByRole('button').map((b) => b.querySelector('.rail__label')?.textContent)).toEqual([
      'All of New York City', 'Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island',
    ])
  })

  it('marks the whole city as selected at first', () => {
    renderWithExplorer(<PlaceList />)
    expect(place(/^All of New York City/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('focuses a borough on click', async () => {
    renderWithExplorer(<PlaceList />)
    await userEvent.click(place(/^Queens/))
    expect(place(/^Queens/)).toHaveAttribute('aria-pressed', 'true')
    expect(place(/^All of New York City/)).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows each place’s value for the layer and years', () => {
    renderWithExplorer(<PlaceList />, { storyId: 'fire', metricId: 'structural-fires' })
    const v = placeValues(getDataset('structural-fires'), getLayer('structural-fires'), { from: 2025, to: 2025 })
    expect(place(/^Queens/)).toHaveTextContent(formatCompact(v.boroughs.Queens))
  })

  it('shortens large values so the names keep their room, with the full value on hover', () => {
    renderWithExplorer(<PlaceList />, { storyId: 'medical', metricId: 'ambulance-calls' })
    const v = placeValues(getDataset('ambulance-calls'), getLayer('ambulance-calls'), { from: 2025, to: 2025 })
    const value = place(/^All of New York City/).querySelector('.rail__value')!
    expect(value).toHaveTextContent(/^[\d.]+[KM]$/)
    expect(value).toHaveAttribute('title', formatCount(v.city))
  })

  it('shows the nearest available year when density has no data for the years chosen', () => {
    renderWithExplorer(<PlaceList />)
    const v = placeValues(getDataset('population-density'), getLayer('population-density'), { from: 2024, to: 2024 })
    expect(place(/^Brooklyn/)).toHaveTextContent(formatCompact(v.boroughs.Brooklyn))
  })

  it('marks the whole city in the story’s colour', () => {
    renderWithExplorer(<PlaceList />, { storyId: 'fire', metricId: 'structural-fires' })
    const swatch = place(/^All of New York City/).querySelector<HTMLElement>('.rail__swatch')!
    expect(swatch).toHaveStyle({ backgroundColor: lightTheme.story.fire.accent })
  })
})
