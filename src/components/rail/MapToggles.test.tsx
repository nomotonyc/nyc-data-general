import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { MapToggles } from './MapToggles'

describe('MapToggles', () => {
  it('shows outlines and labels by default', () => {
    renderWithExplorer(<MapToggles />)
    expect(screen.getByRole('checkbox', { name: 'Precinct outlines' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Place labels' })).toBeChecked()
  })

  it('turns each off independently', async () => {
    renderWithExplorer(<MapToggles />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Place labels' }))
    expect(screen.getByRole('checkbox', { name: 'Place labels' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Precinct outlines' })).toBeChecked()
  })
})
