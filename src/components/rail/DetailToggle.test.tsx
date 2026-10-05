import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { DetailToggle } from './DetailToggle'

describe('DetailToggle', () => {
  it('starts on boroughs', () => {
    renderWithExplorer(<DetailToggle />)
    expect(screen.getByRole('button', { name: 'Boroughs' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to precincts', async () => {
    renderWithExplorer(<DetailToggle />, { geography: 'precincts' })
    await userEvent.click(screen.getByRole('button', { name: 'Precincts' }))
    expect(screen.getByRole('button', { name: 'Precincts' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('locks to precincts and says why when a borough is focused', () => {
    renderWithExplorer(<DetailToggle />, { geography: 'precincts', borough: 'Bronx' })
    expect(screen.getByRole('button', { name: 'Precincts' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Boroughs' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Precincts' })).toBeDisabled()
    expect(screen.getByText('Focused views always show precincts.')).toBeInTheDocument()
  })
})
