import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { LayerPicker } from './LayerPicker'

describe('LayerPicker', () => {
  it('shows the current story’s layer, selected, with its note', () => {
    renderWithExplorer(<LayerPicker />)
    expect(screen.getByRole('radio', { name: /Population density/ })).toBeChecked()
    expect(screen.getByText('Residents per square mile of land')).toBeInTheDocument()
  })

  it('is a heading, so heading navigation reaches it', () => {
    renderWithExplorer(<LayerPicker />)
    expect(screen.getByRole('heading', { name: 'Layer' })).toBeInTheDocument()
  })

  it('follows the story', () => {
    renderWithExplorer(<LayerPicker />, { storyId: 'fire', metricId: 'structural-fires' })
    expect(screen.getByRole('radio', { name: /Structural fires/ })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /Population density/ })).not.toBeInTheDocument()
  })
})
