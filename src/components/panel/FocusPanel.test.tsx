import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datasets, getDataset } from '../../data/load'
import { generateSampleDataset } from '../../data/sample'
import { METHOD_URL } from '../../domain/stories'
import { getLayer, layerMethod, layerSources } from '../../layers'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { FIREHOUSES, FIREHOUSE_METHOD } from '../../data/firehouses'
import { firehousesIn } from '../../panel/firehouses'
import { FocusPanel } from './FocusPanel'

const fire = { storyId: 'fire' as const, metricId: 'structural-fires' }
const section = (name: string) => screen.getByRole('region', { name })

describe('FocusPanel', () => {
  it('headlines the whole city at first', () => {
    renderWithExplorer(<FocusPanel />, { ...fire, geography: 'precincts' })
    const focus = section('In focus')
    expect(within(focus).getByRole('heading', { name: 'New York City' })).toBeInTheDocument()
    expect(focus).toHaveTextContent('All five boroughs · 78 precincts')
    expect(focus).toHaveTextContent('fires')
  })

  it('opens on battalions', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('In focus')).toHaveTextContent('All five boroughs · 49 battalions')
  })

  it('says under the number what it counts', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('In focus')).toHaveTextContent('Incidents FDNY was dispatched to and classified as structural fires · 2025')
  })

  it('headlines a pinned precinct with both ranks', () => {
    renderWithExplorer(<FocusPanel />, { geography: 'precincts', ...fire, borough: 'Bronx', pinnedArea: '44' })
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
    renderWithExplorer(<FocusPanel />, { ...fire, geography: 'precincts' })
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

  describe('for a layer still on sample values', () => {
    // Every layer has real data now; a new layer without a build starts on samples.
    const real = getDataset('population-density')
    beforeEach(() => datasets.add(generateSampleDataset(getLayer('population-density'))))
    afterEach(() => datasets.add(real))

    it('says it holds sample values even while closed', () => {
      renderWithExplorer(<FocusPanel />, { geography: 'precincts' })
      expect(section('Data sources').querySelector('summary')).toHaveTextContent('Data sources · sample values')
    })

    it('says plainly when the values are samples', () => {
      renderWithExplorer(<FocusPanel />, { geography: 'precincts' })
      expect(section('Data sources')).toHaveTextContent('These values are samples')
    })
  })

  it('credits the firehouse listing, with when the city last updated it, while firehouses are shown', () => {
    renderWithExplorer(<FocusPanel />, { ...fire, showFirehouses: true })
    const link = within(section('Data sources')).getByRole('link', { name: 'FDNY Firehouse Listing' })
    expect(link).toHaveAttribute('href', 'https://data.cityofnewyork.us/d/hc8x-tcnd')
    expect(section('Data sources')).toHaveTextContent('Firehouse locations and units, as the city last updated them in April 2022')
  })

  it('explains the firehouses and credits the battalion boundaries they are placed in, while they are shown', () => {
    renderWithExplorer(<FocusPanel />, { ...fire, showFirehouses: true })
    const sources = section('Data sources')
    for (const line of FIREHOUSE_METHOD) expect(sources).toHaveTextContent(line)
    expect(within(sources).getByRole('link', { name: 'Fire Battalions' })).toHaveAttribute('href', 'https://data.cityofnewyork.us/d/xzng-ft6f')
    expect(within(sources).getAllByRole('link', { name: 'Fire Battalions' })).toHaveLength(1)
  })

  it('says nothing about firehouses while none are on screen', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(section('Data sources')).not.toHaveTextContent(FIREHOUSE_METHOD[0])
  })

  it('leaves the firehouse listing out while firehouses are hidden', () => {
    renderWithExplorer(<FocusPanel />, fire)
    expect(within(section('Data sources')).queryByRole('link', { name: 'FDNY Firehouse Listing' })).not.toBeInTheDocument()
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

describe('by battalion', () => {
  const battalions = { storyId: 'fire' as const, metricId: 'fire-apparatus-accidents', geography: 'battalions' as const }

  it('says how battalion figures were placed, and that they are exact', () => {
    renderWithExplorer(<FocusPanel />, battalions)
    expect(section('Data sources')).toHaveTextContent('By battalion: 100% placed by each crash’s coordinates (exact).')
  })

  it('says nothing about placement by precinct, where records carry their precinct', () => {
    renderWithExplorer(<FocusPanel />, { ...battalions, geography: 'precincts' })
    expect(section('Data sources')).not.toHaveTextContent('By battalion')
  })

  it('counts battalions and lists the highest ones', () => {
    renderWithExplorer(<FocusPanel />, battalions)
    expect(section('In focus')).toHaveTextContent('All five boroughs · 49 battalions')
    const top = section('Highest battalions in the city')
    for (const button of within(top).getAllByRole('button')) expect(button).toHaveTextContent(/^\dBattalion \d+/)
  })

  it('pins a battalion from the highest list and ranks it', async () => {
    renderWithExplorer(<FocusPanel />, battalions)
    await userEvent.click(within(section('Highest battalions in the city')).getAllByRole('button')[0])
    expect(within(section('In focus')).getByRole('heading', { name: /^Battalion \d+$/ })).toBeInTheDocument()
    expect(section('In focus')).toHaveTextContent(/of \d+ in .* · \d+(st|nd|rd|th) of 49 citywide/)
    expect(section('In focus')).toHaveTextContent(/the citywide battalion average/)
  })
})

describe('placement for estimated battalions', () => {
  it('says which share is exact and which estimated, writing tiny shares as under 1%', () => {
    renderWithExplorer(<FocusPanel />, { storyId: 'fire', metricId: 'structural-fires', geography: 'battalions' })
    const text = section('Data sources').textContent ?? ''
    expect(text).toMatch(/By battalion: \d+% placed by its alarm box’s published location \(exact\); \d+% placed by its alarm box’s street corner, geocoded \(exact\); .*\(estimated\)/)
    expect(text).not.toMatch(/ 0% placed/)
  })
})

describe('firehouses in the panel', () => {
  const pinnedBattalion = { ...fire, geography: 'battalions' as const, borough: 'Brooklyn' as const, pinnedArea: 'bn31' }

  it('counts a focused borough’s firehouses and companies, by type, whether or not markers are on', () => {
    renderWithExplorer(<FocusPanel />, { ...fire, borough: 'Brooklyn' })
    const expected = firehousesIn(FIREHOUSES, { kind: 'borough', borough: 'Brooklyn' })
    const here = section('Firehouses in Brooklyn')
    expect(here).toHaveTextContent(expected.totals)
    for (const k of expected.byKind) expect(within(here).getByText(k.label)).toBeInTheDocument()
    expect(here.querySelectorAll('.panel__firehouse')).toHaveLength(0)
  })

  it('lists each firehouse in a pinned battalion’s area, with its units', () => {
    renderWithExplorer(<FocusPanel />, pinnedBattalion)
    const expected = firehousesIn(FIREHOUSES, { kind: 'battalion', number: 31 })
    const here = section('Firehouses in Battalion 31’s area')
    expect(here).toHaveTextContent(expected.totals)
    expect([...here.querySelectorAll('.panel__firehouse-address')].map((a) => a.textContent)).toEqual(expected.list!.map((f) => f.address))
  })

  it('shows nothing for the whole city or a pinned precinct', () => {
    renderWithExplorer(<FocusPanel />, { geography: 'precincts', ...fire, borough: 'Brooklyn', pinnedArea: '84' })
    expect(screen.queryByRole('region', { name: /^Firehouses in/ })).not.toBeInTheDocument()
  })

  it('credits the listing in Data sources while the section shows', () => {
    renderWithExplorer(<FocusPanel />, pinnedBattalion)
    expect(within(section('Data sources')).getByRole('link', { name: 'FDNY Firehouse Listing' })).toBeInTheDocument()
  })
})
