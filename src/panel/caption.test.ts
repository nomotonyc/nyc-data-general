import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { initialExplorerState } from '../explorer/state'
import { creditFor, pictureCaption, slug } from './caption'

const fire = { ...initialExplorerState, storyId: 'fire' as const, metricId: 'structural-fires', geography: 'precincts' as const, yearFrom: 2025 as const, yearTo: 2025 as const, showFirehouses: false }
const ds = getDataset('structural-fires', 'precincts')

describe('pictureCaption', () => {
  it('for the place in focus: the layer, the areas it’s by, the place and the years', () => {
    expect(pictureCaption('focus', fire, ds).title).toBe('Structural fires by precinct · New York City · 2025')
    expect(pictureCaption('focus', { ...fire, borough: 'Queens' }, ds).title).toBe('Structural fires by precinct · Queens · 2025')
    expect(pictureCaption('focus', { ...fire, borough: 'Bronx', pinnedArea: '44' }, ds).title).toBe('Structural fires by precinct · Precinct 44 · 2025')
  })

  it('says when it’s by battalion', () => {
    const battalions = getDataset('structural-fires', 'battalions')
    expect(pictureCaption('focus', { ...fire, geography: 'battalions', borough: 'Brooklyn' }, battalions).title).toBe('Structural fires by battalion · Brooklyn · 2025')
  })

  it('for the boroughs compared: by borough, whichever is in focus', () => {
    expect(pictureCaption('boroughs', { ...fire, borough: 'Queens' }, ds).title).toBe('Structural fires by borough · 2025')
  })

  it('for the highest areas: the borough they’re in, not a pinned one', () => {
    expect(pictureCaption('areas', { ...fire, borough: 'Bronx', pinnedArea: '44' }, ds).title).toBe('Structural fires by precinct · Bronx · 2025')
    expect(pictureCaption('areas', fire, ds).title).toBe('Structural fires by precinct · New York City · 2025')
  })

  it('for the map: by borough or by area, as it’s coloured, and the borough in view', () => {
    expect(pictureCaption('map', { ...fire, detail: 'borough' }, ds).title).toBe('Structural fires by borough · New York City · 2025')
    expect(pictureCaption('map', { ...fire, detail: 'area' }, ds).title).toBe('Structural fires by precinct · New York City · 2025')
    expect(pictureCaption('map', { ...fire, borough: 'Bronx', pinnedArea: '44' }, ds).title).toBe('Structural fires by precinct · Bronx · 2025')
  })

  it('credits the firehouse listing only where the picture shows firehouses', () => {
    expect(pictureCaption('focus', { ...fire, showFirehouses: true }, ds).credit).not.toContain('Firehouse')
    expect(pictureCaption('map', { ...fire, showFirehouses: true }, ds).credit).toBe(pictureCaption('map', fire, ds).credit)
  })

  it('for the firehouses: the listing, as last updated, and only its sources', () => {
    const c = pictureCaption('firehouses', fire, ds)
    expect(c.title).toMatch(/^FDNY firehouse listing · updated [A-Z][a-z]+ \d{4}$/)
    expect(c.credit).toBe('Data: FDNY via NYC Open Data')
  })

  it('names the years the data has, which a range reaching past it is cut to', () => {
    const density = getDataset('population-density', 'precincts')
    const demo = { ...initialExplorerState, geography: 'precincts' as const, yearFrom: 2019 as const, yearTo: 2024 as const }
    expect(pictureCaption('focus', demo, density).title).toBe('Population density by precinct · New York City · 2021–2024')
  })

  it('gives a file name for what it shows', () => {
    expect(pictureCaption('focus', { ...fire, borough: 'Queens' }, ds).name).toBe('structural-fires-by-precinct-queens-2025')
  })
})

describe('creditFor', () => {
  const source = (publisher: string) => ({ name: '', publisher, url: publisher, used: '' })

  it('names each publisher once, those via NYC Open Data together, so nothing direct reads as via it', () => {
    const credit = creditFor(['FDNY, via NYC Open Data', 'U.S. Census Bureau', 'NYPD, via NYC Open Data', 'FDNY, via NYC Open Data', 'NYC Department of City Planning'].map(source))
    expect(credit).toBe('Data: FDNY, NYPD via NYC Open Data · U.S. Census Bureau · NYC Department of City Planning')
  })

  it('has no via part when nothing came through NYC Open Data', () => {
    expect(creditFor([source('U.S. Census Bureau')])).toBe('Data: U.S. Census Bureau')
  })
})

describe('slug', () => {
  it('turns words into a file name', () => {
    expect(slug('Structural fires · Battalion 54')).toBe('structural-fires-battalion-54')
    expect(slug('2024–2026 (Jan–Jun)')).toBe('2024-2026-jan-jun')
  })
})
