import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useExplorerDispatch } from '../../explorer/context'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { lightTheme } from '../../theme/tokens'
import { saveImage } from '../saveImage'
import { BoroughBars } from './BoroughBars'
import { FocusSummary } from './FocusSummary'

vi.mock('../saveImage', () => ({ saveImage: vi.fn(async () => 'done') }))

const fire = { storyId: 'fire' as const, metricId: 'structural-fires', geography: 'precincts' as const, yearFrom: 2025 as const, yearTo: 2025 as const }

describe('a panel section saved as a picture', () => {
  it('saves a picture of itself, named for the section and what it shows', async () => {
    renderWithExplorer(<BoroughBars />, fire)
    const section = screen.getByRole('region', { name: 'How the boroughs compare' })
    let content = ''
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      content = node.textContent ?? ''
      return 'done'
    })
    await userEvent.click(within(section).getByRole('button', { name: 'Save image: How the boroughs compare' }))
    const [, options] = vi.mocked(saveImage).mock.calls.at(-1)!
    expect(options).toEqual({ name: 'how-the-boroughs-compare-structural-fires-by-borough-2025', background: lightTheme.color.background })
    expect(content).toMatch(/^Structural fires by borough · 2025How the boroughs compareManhattan/)
    expect(content).toMatch(/Data: FDNY, NYPD.* via NYC Open Data · /)
  })

  it('lays the picture out off the screen, so the section doesn’t move, and takes it away once saved', async () => {
    renderWithExplorer(<BoroughBars />, { ...fire, borough: 'Queens' })
    const section = screen.getByRole('region', { name: 'How the boroughs compare' })
    let firstChild: Element | null = null
    let stage: Element | null = null
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      firstChild = section.firstElementChild
      stage = node.closest('.picture-stage')
      return 'done'
    })
    await userEvent.click(within(section).getByRole('button', { name: /^Save image/ }))
    expect(firstChild).toHaveClass('panel__head')
    expect(stage).toHaveAttribute('inert')
    expect(document.querySelector('.picture-stage')).not.toBeInTheDocument()
    expect(document.querySelector('.picture__credit')).not.toBeInTheDocument()
  })

  it('works for the summary too, under its In focus heading', async () => {
    renderWithExplorer(<FocusSummary />, fire)
    const section = screen.getByRole('region', { name: 'In focus' })
    await userEvent.click(within(section).getByRole('button', { name: 'Save image: In focus' }))
    expect(vi.mocked(saveImage).mock.calls.at(-1)![1].name).toBe('in-focus-structural-fires-by-precinct-new-york-city-2025')
  })

  it('shows Tap to save in words, and forgets it once the view changes, its picture out of date', async () => {
    function NextYear() {
      const dispatch = useExplorerDispatch()
      return <button onClick={() => dispatch({ type: 'setYearFrom', year: 2024 })}>2024</button>
    }
    renderWithExplorer(
      <>
        <BoroughBars />
        <NextYear />
      </>,
      fire,
    )
    vi.mocked(saveImage).mockResolvedValueOnce({ tapToSave: async () => 'done' })
    const section = screen.getByRole('region', { name: 'How the boroughs compare' })
    await userEvent.click(within(section).getByRole('button', { name: /^Save image/ }))
    expect(within(section).getByRole('button', { name: 'Tap to save: How the boroughs compare' })).toHaveTextContent('Tap to save')
    await userEvent.click(screen.getByRole('button', { name: '2024' }))
    expect(within(section).getByRole('button', { name: 'Save image: How the boroughs compare' })).toBeInTheDocument()
  })
})
