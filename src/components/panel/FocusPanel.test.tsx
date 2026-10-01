import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { METHOD_URL } from '../../domain/stories'
import { getLayer, layerMethod, layerSources } from '../../layers'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { FocusPanel } from './FocusPanel'

const fire = { storyId: 'fire' as const, metricId: 'structural-fires' }
const section = (name: string) => screen.getByRole('region', { name })

describe('FocusPanel', () => {
  it('headlines the whole city at first', () => {
    renderWithExplorer(<FocusPanel />, fire)
    const focus = section('In focus')
    expect(within(focus).getByRole('heading', { name: 'New York City' })).toBeInTheDocument()
    expect(focus).toHaveTextContent('All five boroughs · 78 precincts')
    expect(focus).toHaveTextContent('fires')
  })

  it('says under the number what it counts', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('In focus')).toHaveTextContent('Incidents FDNY was dispatched to and classified as structural fires · 2025')
  })

  it('headlines a pinned precinct with both ranks', () => {
    renderWithExplorer(<FocusPanel />, { ...fire, borough: 'Bronx', pinnedPrecinct: 44 })
    expect(within(section('In focus')).getByRole('heading', { name: 'Precinct 44' })).toBeInTheDocument()
    expect(section('In focus')).toHaveTextContent(/in the Bronx · .* citywide/)
  })

  it('focuses a borough from its bar', async () => {
    renderWithExplorer(<FocusPanel />, fire)
    const bars = section('How the boroughs compare')
    await userEvent.click(within(bars).getByRole('button', { name: /^Queens/ }))
    expect(within(bars).getByRole('button', { name: /^Queens/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(section('In focus')).getByRole('heading', { name: 'Queens' })).toBeInTheDocument()
  })

  it('pins a precinct from the highest list, zooming into its borough', async () => {
    renderWithExplorer(<FocusPanel />, fire)
    await userEvent.click(within(section('Highest precincts in the city')).getAllByRole('button')[0])
    const list = screen.getByRole('region', { name: /^Highest precincts in (Manhattan|Bronx|Brooklyn|Queens|Staten Island)$/ })
    expect(within(list).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('data sources', () => {
  it('lists every source for the layer as a link', () => {
    renderWithExplorer(<FocusPanel />, fire)
    const sources = section('Data sources')
    for (const s of layerSources(getLayer('structural-fires'))) {
      expect(within(sources).getByRole('link', { name: s.name })).toHaveAttribute('href', s.url)
    }
  })

  it('explains how the layer is calculated, including the standard caveats', () => {
    renderWithExplorer(<FocusPanel />, fire)
    for (const line of layerMethod(getLayer('structural-fires'))) expect(section('Data sources')).toHaveTextContent(line)
  })

  it('links to the full method', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(within(section('Data sources')).getByRole('link', { name: 'Full method' })).toHaveAttribute('href', METHOD_URL)
  })

  it('stays closed until someone opens it, saving room', async () => {
    renderWithExplorer(<FocusPanel />, fire)
    const details = section('Data sources').querySelector('details')!
    expect(details.open).toBe(false)
    await userEvent.click(within(section('Data sources')).getByText('Data sources'))
    expect(details.open).toBe(true)
  })

  // Population density stays sample data until its build lands.
  it('says it holds sample values even while closed', () => {
    renderWithExplorer(<FocusPanel />)
    expect(section('Data sources').querySelector('summary')).toHaveTextContent('Data sources · sample values')
  })

  it('says plainly when the values are samples', () => {
    renderWithExplorer(<FocusPanel />)
    expect(section('Data sources')).toHaveTextContent('These values are samples')
  })

  it('dates real data by when it was built', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('Data sources')).toHaveTextContent(/Data as of \d{1,2} [A-Z][a-z]+ 20\d\d/)
  })

  it('says nothing about samples once a layer has real data', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('Data sources').querySelector('summary')).toHaveTextContent(/^Data sources$/)
    expect(section('Data sources')).not.toHaveTextContent('samples')
  })

  it('follows the story', () => {
    renderWithExplorer(<FocusPanel />)
    expect(within(section('Data sources')).getByRole('link', { name: /American Community Survey/ })).toBeInTheDocument()
  })
})
