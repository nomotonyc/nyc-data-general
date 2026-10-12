import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDataset } from '../../data/load'
import { initialExplorerState } from '../../explorer/state'
import { BIG, expandedTrend } from '../../panel/expandedTrend'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { lightTheme } from '../../theme/tokens'
import { Trend } from './Trend'
import { saveImage } from './saveImage'

vi.mock('./saveImage', () => ({ saveImage: vi.fn(async () => 'done') }))

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

  describe('pointing at the chart', () => {
    // jsdom lays nothing out: the chart is drawn at its own size, so a screen x is an SVG x.
    const drawnAtOwnSize = () =>
      vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: BIG.width, height: BIG.height } as DOMRect)
    const columns = expandedTrend({ ...initialExplorerState, ...fire, borough: 'Queens' }, getDataset('structural-fires'), { accent: '', ramp: [], city: '' }, null)!.columns
    /** The middle of a period's column, on screen. */
    const at = (i: number) => columns[i].x + columns[i].width / 2
    afterEach(() => vi.restoreAllMocks())

    it('reads out the last month, then whichever month the mouse is over', async () => {
      await open()
      drawnAtOwnSize()
      const readout = within(dialog()).getByRole('status')
      expect(readout).toHaveTextContent('Dec 2025')
      fireEvent.pointerMove(within(dialog()).getByRole('img'), { clientX: at(3), pointerType: 'mouse' })
      expect(readout).toHaveTextContent('Apr 2025')
      expect(readout).toHaveTextContent(/Queens.*New York City/)
    })

    it('follows a finger dragged across it, and keeps the last month read once it lifts', async () => {
      await open()
      drawnAtOwnSize()
      const chart = within(dialog()).getByRole('img')
      const readout = within(dialog()).getByRole('status')
      fireEvent.pointerDown(chart, { clientX: at(1), pointerType: 'touch' })
      expect(readout).toHaveTextContent('Feb 2025')
      fireEvent.pointerMove(chart, { clientX: at(5), pointerType: 'touch' })
      expect(readout).toHaveTextContent('Jun 2025')
      fireEvent.pointerLeave(chart, { pointerType: 'touch' })
      expect(readout).toHaveTextContent('Jun 2025')
    })

    it('goes back to the last month when the mouse leaves', async () => {
      await open()
      drawnAtOwnSize()
      const chart = within(dialog()).getByRole('img')
      fireEvent.pointerMove(chart, { clientX: at(3), pointerType: 'mouse' })
      fireEvent.pointerLeave(chart, { pointerType: 'mouse' })
      expect(within(dialog()).getByRole('status')).toHaveTextContent('Dec 2025')
    })
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

  it('draws its chart at the width it has, so a phone’s keeps readable labels', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(340)
    await open()
    expect(within(dialog()).getByRole('img').getAttribute('viewBox')).toMatch(/^0 0 340 /)
    vi.restoreAllMocks()
  })

  it('saves itself as a picture, named for the layer, place and years, without its buttons', async () => {
    await open()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save image' }))
    const [node, options] = vi.mocked(saveImage).mock.calls.at(-1)!
    expect(node).toBe(dialog())
    expect(options).toEqual({ name: 'structural-fires-queens-2025', background: lightTheme.color.background })
    for (const button of within(dialog()).getAllByRole('button')) expect(button.dataset.export).toBe('skip')
  })

  it('keeps focus on Save image while it saves, so Tab stays in the dialog', async () => {
    await open()
    let release = () => {}
    vi.mocked(saveImage).mockImplementationOnce(() => new Promise<'done'>((r) => (release = () => r('done'))))
    const button = within(dialog()).getByRole('button', { name: 'Save image' })
    await userEvent.click(button)
    expect(within(dialog()).getByRole('button', { name: 'Saving…' })).toHaveFocus()
    expect(within(dialog()).getByRole('button', { name: 'Saving…' })).toHaveAttribute('aria-disabled', 'true')
    await act(async () => release())
    expect(within(dialog()).getByRole('button', { name: 'Save image' })).toHaveFocus()
  })

  it('says when saving fails, and can try again', async () => {
    await open()
    vi.mocked(saveImage).mockRejectedValueOnce(new Error('canvas too large'))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save image' }))
    expect(within(dialog()).getByRole('button', { name: 'Couldn’t save, try again' })).toBeInTheDocument()
  })

  it('asks for another tap when a phone needs one to open its share sheet', async () => {
    await open()
    const share = vi.fn(async () => 'done' as const)
    vi.mocked(saveImage).mockResolvedValueOnce({ tapToSave: share })
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save image' }))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Tap to save' }))
    expect(share).toHaveBeenCalled()
    expect(within(dialog()).getByRole('button', { name: 'Save image' })).toBeInTheDocument()
  })

  it('leaves the month pointed at out of the picture (its month, values, guide, dots and label), keeping the key to the lines', async () => {
    await open()
    const skipped = (el: Element | null) => (el as HTMLElement).dataset.export === 'skip'
    let during: Record<string, unknown> | null = null
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      const readout = node.querySelector('[role="status"]')!
      during = {
        guide: !!node.querySelector('.trend-dialog__guide'),
        dots: node.querySelectorAll('.trend-dialog__marker').length,
        current: !!node.querySelector('.trend-dialog__tick--current'),
        readout: skipped(readout),
        month: !!readout.querySelector('.trend-dialog__readout-period'),
        values: readout.querySelectorAll('.trend-dialog__readout-value').length,
        key: [...readout.querySelectorAll('.trend-dialog__readout-item')].map((i) => i.textContent?.replace(/[\d,.]+/g, '').trim()),
        oneLine: readout.classList.contains('trend-dialog__readout--key'),
      }
      return 'done'
    })
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save image' }))
    expect(during).toEqual({ guide: false, dots: 0, current: false, readout: false, month: false, values: 0, key: ['Queens', 'New York City'], oneLine: true })
    expect(within(dialog()).getByRole('status')).not.toHaveClass('trend-dialog__readout--key')
    // and back on screen once saved
    expect(dialog().querySelector('.trend-dialog__guide')).toBeInTheDocument()
    expect(dialog().querySelectorAll('.trend-dialog__readout-value')).toHaveLength(2)
    expect(dialog().querySelectorAll('.trend-dialog__marker').length).toBeGreaterThan(0)
  })

  it('offers no larger view when there is no trend', () => {
    renderWithExplorer(<Trend />)
    expect(screen.queryByRole('button', { name: 'Expand trend' })).not.toBeInTheDocument()
  })
})
