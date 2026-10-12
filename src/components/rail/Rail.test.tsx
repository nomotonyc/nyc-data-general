import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { Rail } from './Rail'

describe('Rail', () => {
  it('lists the places, then the map controls', () => {
    renderWithExplorer(<Rail />)
    expect(screen.getByRole('heading', { name: 'Where' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Layer' })).toBeInTheDocument()
  })

  it('can leave the places out, where the panel already lists them', () => {
    renderWithExplorer(<Rail places={false} />)
    expect(screen.queryByRole('heading', { name: 'Where' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Layer' })).toBeInTheDocument()
  })
})
