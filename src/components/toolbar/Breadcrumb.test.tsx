import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { Breadcrumb } from './Breadcrumb'

const current = () => screen.getByRole('navigation', { name: 'Geography' }).querySelector('[aria-current="location"]')

describe('Breadcrumb', () => {
  it('shows only New York City at city level', () => {
    renderWithExplorer(<Breadcrumb />)
    expect(current()).toHaveTextContent('New York City')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the focused borough after the city', () => {
    renderWithExplorer(<Breadcrumb />, { borough: 'Bronx' })
    expect(screen.getByRole('button', { name: 'New York City' })).toBeInTheDocument()
    expect(current()).toHaveTextContent('Bronx')
  })

  it('steps back to the city', async () => {
    renderWithExplorer(<Breadcrumb />, { borough: 'Bronx', pinnedArea: '44' })
    await userEvent.click(screen.getByRole('button', { name: 'New York City' }))
    expect(current()).toHaveTextContent('New York City')
  })

  it('steps back from a pinned precinct to its borough', async () => {
    renderWithExplorer(<Breadcrumb />, { borough: 'Bronx', pinnedArea: '44' })
    expect(current()).toHaveTextContent('Precinct 44')
    await userEvent.click(screen.getByRole('button', { name: 'Bronx' }))
    expect(current()).toHaveTextContent('Bronx')
  })

  it('keeps the separators out of what screen readers announce', () => {
    const { container } = renderWithExplorer(<Breadcrumb />, { borough: 'Bronx', pinnedArea: '44' })
    const separators = container.querySelectorAll('.breadcrumb__separator')
    expect(separators).toHaveLength(2)
    for (const s of separators) expect(s).toHaveAttribute('aria-hidden', 'true')
  })

  it('names precinct 116 on its own', () => {
    renderWithExplorer(<Breadcrumb />, { storyId: 'fire', metricId: 'structural-fires', borough: 'Queens', pinnedArea: '116' })
    expect(current()).toHaveTextContent('Precinct 116')
  })
})

describe('Breadcrumb by battalion', () => {
  it('names a pinned battalion', () => {
    renderWithExplorer(<Breadcrumb />, { storyId: 'fire', metricId: 'fire-apparatus-accidents', geography: 'battalions', borough: 'Bronx', pinnedArea: 'bn14' })
    expect(screen.getByText('Battalion 14')).toHaveAttribute('aria-current', 'location')
  })
})
