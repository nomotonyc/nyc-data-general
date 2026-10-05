import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { MapToggles } from './MapToggles'

describe('MapToggles', () => {
  it('shows outlines and labels by default', () => {
    renderWithExplorer(<MapToggles />, { geography: 'precincts' })
    expect(screen.getByRole('checkbox', { name: 'Precinct outlines' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Place labels' })).toBeChecked()
  })

  it('turns each off independently', async () => {
    renderWithExplorer(<MapToggles />, { geography: 'precincts' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Place labels' }))
    expect(screen.getByRole('checkbox', { name: 'Place labels' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Precinct outlines' })).toBeChecked()
  })
})

describe('MapToggles firehouses', () => {
  it('offers firehouses, off until asked for', async () => {
    renderWithExplorer(<MapToggles />)
    const box = screen.getByRole('checkbox', { name: 'Firehouses' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    expect(box).toBeChecked()
  })

  it('keys each marker, from a firehouse up to a borough command, while firehouses are shown', async () => {
    renderWithExplorer(<MapToggles />)
    expect(screen.queryByRole('list', { name: 'Firehouse markers' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Firehouses' }))
    const key = screen.getByRole('list', { name: 'Firehouse markers' })
    expect(within(key).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Firehouse', 'Battalion HQ', 'Division HQ', 'Borough command HQ'])
  })
})

describe('MapToggles by geography', () => {
  it('names the outlines after the areas shown', () => {
    renderWithExplorer(<MapToggles />, { storyId: 'fire', metricId: 'fire-apparatus-accidents', geography: 'battalions' })
    expect(screen.getByRole('checkbox', { name: 'Battalion outlines' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Precinct outlines' })).not.toBeInTheDocument()
  })
})
