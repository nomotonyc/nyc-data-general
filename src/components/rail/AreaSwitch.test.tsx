import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LAYERS, layerGeographies } from '../../layers'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { Rail } from './Rail'

const areas = () => screen.getByRole('group', { name: 'Areas' })
const detail = () => screen.getByRole('group', { name: 'Detail' })

describe('AreaSwitch', () => {
  it('switches a layer with battalion data to battalions, and the Detail toggle follows', async () => {
    renderWithExplorer(<Rail />, { geography: 'precincts', storyId: 'fire', metricId: 'fire-apparatus-accidents' })
    expect(within(areas()).getByRole('button', { name: 'Precincts' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(areas()).getByRole('button', { name: 'Battalions' }))
    expect(within(areas()).getByRole('button', { name: 'Battalions' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(detail()).getByRole('button', { name: 'Battalions' })).toBeInTheDocument()
    expect(within(detail()).queryByRole('button', { name: 'Precincts' })).not.toBeInTheDocument()
  })

  // Every layer has battalions today; a new layer without them must say so rather than show an empty map.
  const without = LAYERS.find((l) => !layerGeographies(l).includes('battalions'))

  it.runIf(without)('says when a layer is not available by battalion, instead of showing an empty map', () => {
    renderWithExplorer(<Rail />, { storyId: without!.story, metricId: without!.id })
    expect(within(areas()).getByRole('button', { name: 'Battalions' })).toBeDisabled()
    expect(screen.getByText(`${without!.label} isn’t available by battalion yet.`)).toBeInTheDocument()
  })

  it('offers battalions for every layer that has them', () => {
    for (const layer of LAYERS.filter((l) => layerGeographies(l).includes('battalions'))) {
      const { unmount } = renderWithExplorer(<Rail />, { storyId: layer.story, metricId: layer.id })
      expect(within(areas()).getByRole('button', { name: 'Battalions' }), layer.id).toBeEnabled()
      unmount()
    }
  })
})
