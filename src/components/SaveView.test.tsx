import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHONE_LAYOUT } from '../map/config'
import { renderWithExplorer } from '../test/renderWithExplorer'
import { MapShotContext, mapShooter, type MapShooter } from './mapShot'
import { saveImage } from './saveImage'
import { SaveView, TREND_WIDTH } from './SaveView'
import { layersOf } from '../layers'

vi.mock('./saveImage', () => ({ saveImage: vi.fn(async () => 'done') }))

const fire = { storyId: 'fire' as const, metricId: 'structural-fires', geography: 'battalions' as const, borough: 'Brooklyn' as const, yearFrom: 2025 as const, yearTo: 2025 as const }
const legend = { title: 'Structural fires, 2025 · by battalion', lo: '244', hi: '743', steps: ['#fff'], note: null }

function withMap(shooter: MapShooter) {
  return renderWithExplorer(
    <MapShotContext.Provider value={shooter}>
      <SaveView />
    </MapShotContext.Provider>,
    fire,
  )
}

describe('SaveView', () => {
  beforeEach(() => {
    Object.assign(URL, { revokeObjectURL: vi.fn() })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('saves the whole view as one picture: what it shows, the map and its legend, the panel, whose data', async () => {
    const shooter = mapShooter()
    shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend }))
    withMap(shooter)
    let picture: Record<string, unknown> = {}
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      picture = {
        title: node.querySelector('.view-picture__header .picture__title')?.textContent,
        brand: node.querySelector('.view-picture__header .view-picture__brand')?.getAttribute('src'),
        map: node.querySelector('.map-picture img')?.getAttribute('src'),
        legend: node.querySelector('.map-legend')?.textContent?.startsWith('Structural fires, 2025 · by battalion'),
        focus: !!node.querySelector('[aria-labelledby]') && node.textContent?.includes('In focus'),
        boroughs: node.textContent?.includes('How the boroughs compare'),
        credit: node.querySelector('.picture__credit')?.textContent?.startsWith('Data: '),
      }
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(picture).toEqual({ title: 'Structural fires by battalion · Brooklyn · 2025', brand: expect.stringContaining('nyc-brand.png'), map: 'blob:map', legend: true, focus: true, boroughs: true, credit: true })
    expect(vi.mocked(saveImage).mock.calls.at(-1)![1].name).toBe('view-structural-fires-by-battalion-brooklyn-2025')
    expect(document.querySelector('.picture-stage')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:map')
  })

  it('places comparison left of the map and battalions and trend on its right', async () => {
    const shooter = mapShooter()
    shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend }))
    withMap(shooter)
    let layout: Record<string, unknown> = {}
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      const map = node.querySelector<HTMLElement>('.view-picture__map')!
      const trend = node.querySelector('.view-picture__trend')
      layout = {
        parts: [...node.querySelector('.view-picture__body')!.children].map((r) => r.className),
        trend: {
          chart: trend?.querySelector('svg')?.getAttribute('viewBox'),
          key: [...(trend?.querySelectorAll('.trend-dialog__readout-name') ?? [])].map((n) => n.textContent),
          marked: !!trend?.querySelector('.trend-dialog__guide, .trend-dialog__marker'),
        },
        columns: [...node.querySelectorAll('.view-picture__column')].map((c) => [...c.querySelectorAll('.panel__title, .panel__kicker')].map((h) => h.textContent)),
        trendColumn: trend?.parentElement?.classList.contains('view-picture__column--right'),
        battalionsOnRight: node.querySelector('.view-picture__column--right')?.textContent?.includes('5 Highest battalions in Brooklyn'),
        // jsdom lays nothing out, so the details measure nothing and the map takes its least height.
        map: map.style.width,
        mapWidth: node.style.getPropertyValue('--view-map-width'),
        mapFullWidth: node.style.getPropertyValue('--view-map-full-width'),
      }
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(layout).toEqual({
      parts: ['panel view-picture__column view-picture__column--left', 'view-picture__map', 'panel view-picture__column view-picture__column--right'],
      columns: [['In focus', 'How the boroughs compare'], ['Building type', '5 Highest battalions in Brooklyn', 'Firehouses in Brooklyn', 'Trend · Brooklyn']],
      trendColumn: true,
      battalionsOnRight: true,
      trend: { chart: `0 0 ${TREND_WIDTH} 300`, key: ['Brooklyn', 'New York City'], marked: false },
      map: '',
      mapWidth: '767px',
      mapFullWidth: '853px',
    })
  })

  it('centers the title above a tighter citywide map while keeping the logo at the upper left', async () => {
    const shooter = mapShooter()
    shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend }))
    renderWithExplorer(<MapShotContext.Provider value={shooter}><SaveView /></MapShotContext.Provider>,
      { storyId: 'fire', metricId: 'structural-fires', geography: 'battalions', borough: null, detail: 'borough', yearFrom: 2025, yearTo: 2025 })
    let picture: HTMLElement | null = null
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      picture = node.cloneNode(true) as HTMLElement
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    const header = picture!.querySelector('.view-picture__header')!
    expect(header.children[0]).toHaveClass('view-picture__brand')
    expect(header.children[1]).toHaveClass('picture__title')
    expect(header.children[1]).toHaveTextContent('Structural fires by borough · New York City · 2025')
    expect(picture!.style.getPropertyValue('--view-map-width')).toBe('597px')
    expect(picture!.querySelector<HTMLElement>('.view-picture__map')!.style.width).toBe('')
  })

  it('says why there’s no trend, as the panel does, where there’s only one year’s estimate', async () => {
    const shooter = mapShooter()
    shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend }))
    renderWithExplorer(
      <MapShotContext.Provider value={shooter}>
        <SaveView />
      </MapShotContext.Provider>,
      { geography: 'precincts' },
    )
    let trend = ''
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      trend = node.querySelector('.view-picture__trend')?.textContent ?? ''
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(trend).toMatch(/Only one yearly estimate/)
  })

  for (const storyId of ['demographic', 'medical'] as const) {
    for (const layer of layersOf(storyId)) {
      it(`${storyId}: saves ${layer.label} with its map, legend and right-side analytics`, async () => {
        const shooter = mapShooter()
        shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend: { ...legend, title: `${layer.label}, 2024 · by battalion` } }))
        renderWithExplorer(
          <MapShotContext.Provider value={shooter}><SaveView /></MapShotContext.Provider>,
          { storyId, metricId: layer.id, geography: 'battalions', borough: 'Queens' },
        )
        let picture: HTMLElement | null = null
        vi.mocked(saveImage).mockImplementationOnce(async (node) => {
          picture = node.cloneNode(true) as HTMLElement
          return 'done'
        })
        await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
        expect(picture).not.toBeNull()
        const columns = picture!.querySelector('.view-picture__body')!.children
        expect(columns[0]).toHaveClass('view-picture__column--left')
        expect(columns[1]).toHaveClass('view-picture__map')
        expect(columns[2]).toHaveClass('view-picture__column--right')
        expect(columns[2]).toHaveTextContent(layer.breakdown.title)
        expect(columns[2]).toHaveTextContent(/5 (Highest|Fastest)/)
        expect(columns[2]).toHaveTextContent('Trend · Queens')
        expect(picture!.querySelector('.map-legend')).toHaveTextContent(layer.label)
        expect(picture!.textContent).not.toMatch(/NaN|Infinity/)
      })
    }
  }

  it('says it couldn’t save while the map hasn’t loaded', async () => {
    withMap(mapShooter())
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(screen.getByRole('button', { name: 'Couldn’t save, try again' })).toBeInTheDocument()
  })

  it('isn’t offered on a phone, whose screen the view doesn’t fit', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === PHONE_LAYOUT, addEventListener: () => {}, removeEventListener: () => {} }))
    withMap(mapShooter())
    expect(screen.queryByRole('button', { name: 'Save view' })).not.toBeInTheDocument()
  })
})
