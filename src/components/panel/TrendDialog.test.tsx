import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { lightTheme } from '../../theme/tokens'
import { Trend } from './Trend'

const fire = { storyId: 'fire' as const, metricId: 'structural-fires' }
const dialog = () => screen.getByRole('dialog', { name: 'Structural fires · Queens' })

async function open() {
  renderWithExplorer(<Trend />, { ...fire, borough: 'Queens' })
  await userEvent.click(screen.getByRole('button', { name: 'Expand trend' }))
}

describe('expanded trend', () => {
  it('opens from the Expand button, as a modal with the stats', async () => {
    await open()
    expect(dialog()).toHaveAttribute('aria-modal', 'true')
    expect(dialog()).toHaveTextContent('Fire · Monthly trend')
    expect(dialog()).toHaveTextContent('Month by month, Jan 2025 to Dec 2025, against New York City')
    expect(within(dialog()).getByText('Compared with New York City')).toBeInTheDocument()
  })

  it('carries the story colour, since it renders outside the explorer', async () => {
    await open()
    expect(document.querySelector<HTMLElement>('.trend-dialog')!.style.getPropertyValue('--story-accent')).toBe(lightTheme.story.fire.accent)
  })

  it('opens from the small chart too', async () => {
    renderWithExplorer(<Trend />, { ...fire, borough: 'Queens' })
    await userEvent.click(screen.getByRole('button', { name: /Structural fires, monthly, 2025, for Queens, New York City\. Open a larger view/ }))
    expect(dialog()).toBeInTheDocument()
  })

  it('moves focus to Close, and back to Expand when closed', async () => {
    await open()
    expect(within(dialog()).getByRole('button', { name: 'Close' })).toHaveFocus()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand trend' })).toHaveFocus()
  })

  it('closes on Escape', async () => {
    await open()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when the backdrop is clicked', async () => {
    await open()
    await userEvent.click(screen.getByTestId('trend-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps Tab inside the dialog', async () => {
    await open()
    await userEvent.tab()
    await userEvent.tab()
    expect(dialog()).toContainElement(document.activeElement as HTMLElement)
  })

  it('reads out the last month, then whichever month is hovered', async () => {
    await open()
    const readout = within(dialog()).getByRole('status')
    expect(readout).toHaveTextContent('Dec 2025')
    fireEvent.mouseEnter(dialog().querySelectorAll('[data-period]')[3])
    expect(readout).toHaveTextContent('Apr 2025')
    expect(readout).toHaveTextContent(/Queens.*New York City/)
  })

  it('steps through months with the arrow keys', async () => {
    await open()
    const chart = within(dialog()).getByRole('img')
    chart.focus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(within(dialog()).getByRole('status')).toHaveTextContent('Oct 2025')
    await userEvent.keyboard('{Home}')
    expect(within(dialog()).getByRole('status')).toHaveTextContent('Jan 2025')
  })

  it('offers no larger view when there is no trend', () => {
    renderWithExplorer(<Trend />)
    expect(screen.queryByRole('button', { name: 'Expand trend' })).not.toBeInTheDocument()
  })
})
