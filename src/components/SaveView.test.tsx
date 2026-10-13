import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHONE_LAYOUT } from '../map/config'
import { renderWithExplorer } from '../test/renderWithExplorer'
import { MapShotContext, mapShooter, type MapShooter } from './mapShot'
import { saveImage } from './saveImage'
import { MIN_MAP_HEIGHT, SaveView, TREND_WIDTH } from './SaveView'

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
        title: node.querySelector('.picture__title')?.textContent,
        map: node.querySelector('img')?.getAttribute('src'),
        legend: node.querySelector('.map-legend')?.textContent?.startsWith('Structural fires, 2025 · by battalion'),
        focus: !!node.querySelector('[aria-labelledby]') && node.textContent?.includes('In focus'),
        boroughs: node.textContent?.includes('How the boroughs compare'),
        credit: node.querySelector('.picture__credit')?.textContent?.startsWith('Data: '),
      }
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(picture).toEqual({ title: 'Structural fires by battalion · Brooklyn · 2025', map: 'blob:map', legend: true, focus: true, boroughs: true, credit: true })
    expect(vi.mocked(saveImage).mock.calls.at(-1)![1].name).toBe('view-structural-fires-by-battalion-brooklyn-2025')
    expect(document.querySelector('.picture-stage')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:map')
  })

  it('puts the details in two columns with the trend across both, and the map beside them as tall as they are', async () => {
    const shooter = mapShooter()
    shooter.set(async () => ({ url: 'blob:map', width: 800, height: 600, legend }))
    withMap(shooter)
    let layout: Record<string, unknown> = {}
    vi.mocked(saveImage).mockImplementationOnce(async (node) => {
      const map = node.querySelector<HTMLElement>('.view-picture__map')!
      const trend = node.querySelector('.view-picture__trend')
      layout = {
        parts: [...node.querySelector('.view-picture__body')!.children].map((r) => r.className),
        details: [...node.querySelector('.view-picture__details')!.children].map((r) => r.className),
        trend: {
          chart: trend?.querySelector('svg')?.getAttribute('viewBox'),
          key: [...(trend?.querySelectorAll('.trend-dialog__readout-name') ?? [])].map((n) => n.textContent),
          marked: !!trend?.querySelector('.trend-dialog__guide, .trend-dialog__marker'),
        },
        columns: [...node.querySelectorAll('.view-picture__column')].map((c) => [...c.querySelectorAll('.panel__title, .panel__kicker')].map((h) => h.textContent)),
        // jsdom lays nothing out, so the details measure nothing and the map takes its least height.
        map: map.style.width,
      }
      return 'done'
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(layout).toEqual({
      parts: ['view-picture__details', 'view-picture__map'],
      details: ['panel view-picture__column', 'panel view-picture__column', 'panel__section view-picture__trend'],
      columns: [['In focus', 'Building type'], ['How the boroughs compare', 'Highest battalions in Brooklyn', 'Firehouses in Brooklyn']],
      trend: { chart: `0 0 ${TREND_WIDTH} 300`, key: ['Brooklyn', 'New York City'], marked: false },
      map: `${Math.round((MIN_MAP_HEIGHT * 800) / 600)}px`,
    })
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
