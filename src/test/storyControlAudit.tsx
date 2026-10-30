import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Breadcrumb } from '../components/toolbar/Breadcrumb'
import { YearRange } from '../components/toolbar/YearRange'
import { Rail } from '../components/rail/Rail'
import { FocusPanel } from '../components/panel/FocusPanel'
import { areasOf, GEOGRAPHIES } from '../domain/geography'
import { type StoryId } from '../domain/stories'
import { layersOf } from '../layers'
import { renderWithExplorer } from './renderWithExplorer'

const areas = () => screen.getByRole('group', { name: 'Areas' })
const detail = () => screen.getByRole('group', { name: 'Detail' })
const rail = () => screen.getByRole('complementary', { name: 'Map controls' })
const focus = () => screen.getByRole('region', { name: 'In focus' })
const current = () => screen.getByRole('navigation', { name: 'Geography' }).querySelector('[aria-current="location"]')

function page(story: StoryId) {
  renderWithExplorer(
    <>
      <Breadcrumb />
      <YearRange />
      <aside aria-label="Map controls"><Rail /></aside>
      <FocusPanel />
    </>,
    { storyId: story, metricId: layersOf(story)[0].id, geography: 'battalions' },
  )
}

/** Test the actual controls and panels after the pure transition matrix for this page. */
export function auditStoryControls(story: StoryId) {
  describe(`${story} control wiring`, () => {
    it('changes every layer and its values, breakdown, and source credit', async () => {
      page(story)
      for (const layer of layersOf(story)) {
        await userEvent.click(within(rail()).getByRole('radio', { name: new RegExp(`^${layer.label}`) }))
        expect(within(rail()).getByRole('radio', { name: new RegExp(`^${layer.label}`) })).toBeChecked()
        expect(focus()).toHaveTextContent(layer.measure)
        expect(screen.getByRole('region', { name: layer.breakdown.title })).toBeInTheDocument()
        const sourceRegion = screen.getByRole('region', { name: 'Data sources' })
        for (const source of layer.sources) {
          expect(within(sourceRegion).getByRole('link', { name: source.name })).toHaveAttribute('href', source.url)
        }
      }
    })

    it('switches every area type while focused and pinned, retaining marker choices', async () => {
      page(story)
      await userEvent.click(within(rail()).getByRole('button', { name: /^Queens/ }))
      for (const name of ['Hospitals', 'EMS stations', 'Firehouses']) await userEvent.click(within(rail()).getByRole('checkbox', { name }))
      for (const [index, geography] of GEOGRAPHIES.entries()) {
        const name = ['Division', 'Precinct', 'Battalion', 'Neighborhoods'][index]
        await userEvent.click(within(areas()).getByRole('button', { name }))
        expect(within(areas()).getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
        expect(focus()).toHaveTextContent('Queens')
        expect(within(detail()).getByRole('button', { name: geography === 'neighborhoods' ? 'Neighborhood' : name })).toBeDisabled()
        const list = screen.getByRole('region', { name: new RegExp(`^5 (Highest|Fastest) .* in Queens$`) })
        const first = within(list).getAllByRole('button').find((button) => button.hasAttribute('aria-pressed'))!
        await userEvent.click(first)
        expect(current()).toHaveTextContent(areasOf(geography).find((area) => area.label === first.querySelector('.panel__top-label')?.textContent)!.label)
        await userEvent.click(within(areas()).getByRole('button', { name: ['Division', 'Precinct', 'Battalion', 'Neighborhoods'][(index + 1) % 4] }))
        expect(current()).toHaveTextContent('Queens')
        await userEvent.click(within(areas()).getByRole('button', { name }))
        for (const marker of ['Hospitals', 'EMS stations', 'Firehouses']) expect(within(rail()).getByRole('checkbox', { name: marker })).toBeChecked()
      }
    })

    it('moves through borough bars, pinning and breadcrumb reset', async () => {
      page(story)
      await userEvent.click(within(screen.getByRole('region', { name: 'How the boroughs compare' })).getByRole('button', { name: /^Bronx/ }))
      expect(current()).toHaveTextContent('Bronx')
      const list = screen.getByRole('region', { name: /^5 (Highest|Fastest) .* in Bronx$/ })
      await userEvent.click(within(list).getAllByRole('button').find((button) => button.hasAttribute('aria-pressed'))!)
      expect(focus()).not.toHaveTextContent('New York City')
      await userEvent.click(screen.getByRole('button', { name: 'Bronx' }))
      expect(current()).toHaveTextContent('Bronx')
      await userEvent.click(screen.getByRole('button', { name: 'New York City' }))
      expect(current()).toHaveTextContent('New York City')
    })

    it('updates years and opens the trend when enough periods are available', async () => {
      page(story)
      if (story === 'demographic') {
        await userEvent.selectOptions(screen.getByLabelText('From'), '2021')
        await userEvent.selectOptions(screen.getByLabelText('to'), '2024')
      } else {
        await userEvent.selectOptions(screen.getByLabelText('From'), '2024')
        await userEvent.selectOptions(screen.getByLabelText('to'), '2025')
      }
      expect(focus()).toHaveTextContent(story === 'demographic' ? '2021–2024' : '2024–2025')
      await userEvent.click(screen.getByRole('button', { name: 'Expand trend' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('toggles every map overlay and its key without changing focus', async () => {
      page(story)
      const names = ['Battalion outlines', 'Place labels', 'Hospitals', 'EMS stations', 'Firehouses']
      for (const name of names) {
        const box = within(rail()).getByRole('checkbox', { name })
        const wasChecked = (box as HTMLInputElement).checked
        await userEvent.click(box)
        expect(box).toHaveProperty('checked', !wasChecked)
      }
      expect(within(rail()).getByRole('list', { name: 'EMS station markers' })).toBeInTheDocument()
      expect(within(rail()).getByRole('list', { name: 'Firehouse markers' })).toBeInTheDocument()
      expect(focus()).toHaveTextContent('New York City')
    })

    it('expands data sources and opens the PDF print action', async () => {
      page(story)
      const source = screen.getByRole('region', { name: 'Data sources' }).querySelector('details')!
      await userEvent.click(within(source).getByText('Data sources'))
      expect(source.open).toBe(true)
      const print = vi.spyOn(window, 'print').mockImplementation(() => {})
      await userEvent.click(within(rail()).getByRole('button', { name: 'Save as PDF' }))
      expect(print).toHaveBeenCalledOnce()
      print.mockRestore()
    })
  })
}
