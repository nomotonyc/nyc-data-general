import { describe, expect, it } from 'vitest'
import { STORIES, YEARS } from '../domain/stories'
import { LAYERS, getLayer, layerMethod, layerSources, layersOf } from '.'

describe('the layer registry', () => {
  // These checks name layers one at a time, so adding a layer file never means editing tests.
  it('finds the layer files', () => {
    expect(LAYERS.map((l) => l.id)).toEqual(expect.arrayContaining(['population-density', 'structural-fires', 'ems-calls']))
  })

  it('lists each story’s layers in their picker order', () => {
    expect(layersOf('fire').map((l) => l.id)).toContain('structural-fires')
    for (const s of STORIES) {
      const orders = layersOf(s.id).map((l) => l.order)
      expect([...orders].sort((a, b) => a - b), s.id).toEqual(orders)
    }
  })

  it('gives every story at least one layer', () => {
    for (const s of STORIES) expect(layersOf(s.id).length, s.id).toBeGreaterThan(0)
  })

  it('looks layers up by id, and nothing else', () => {
    expect(getLayer('ems-calls').label).toBe('EMS calls')
    expect(() => getLayer('nope')).toThrow(/nope/)
  })
})

describe('the three layers', () => {
  it.each([
    ['population-density', 'demographic', 'Population density', 'Residents per square mile of land'],
    ['structural-fires', 'fire', 'Structural fires', 'Fires in buildings FDNY was dispatched to'],
    ['ems-calls', 'medical', 'EMS calls', 'Medical emergencies FDNY EMS was dispatched to'],
  ])('%s has its story, title and subtitle from the spec', (id, story, label, note) => {
    expect(getLayer(id)).toMatchObject({ story, label, note })
  })

  it('compute density as a ratio and counts as sums', () => {
    expect(getLayer('population-density').aggregation).toBe('ratio')
    expect(getLayer('structural-fires').aggregation).toBe('sum')
    expect(getLayer('ems-calls').aggregation).toBe('sum')
  })

  it('declare the time detail, areas and years each source supports', () => {
    expect(getLayer('population-density').data).toEqual({ resolution: 'year', areas: 'precincts', firstYear: 2021, lastYear: 2024 })
    for (const id of ['structural-fires', 'ems-calls']) {
      expect(getLayer(id).data).toEqual({ resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 })
    }
  })

  it.each([
    ['population-density', 'Age mix', ['Under 18', '18–34', '35–64', '65 and over']],
    ['structural-fires', 'Building type', ['Apartment building', 'Hotel, shelter or SRO', 'House', 'Commercial', 'Public or institutional', 'Vacant or under construction']],
    ['ems-calls', 'Call type', ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other']],
  ])('%s has its breakdown from the spec', (id, title, parts) => {
    expect(getLayer(id).breakdown).toEqual({ title, parts })
  })
})

describe('every layer file', () => {
  it.each(LAYERS.map((l) => [l.id, l] as const))('%s is complete', (_, layer) => {
    expect(layer.id).toMatch(/^[a-z0-9-]+$/)
    expect(STORIES.map((s) => s.id)).toContain(layer.story)
    expect(layer.label && layer.note && layer.unit).toBeTruthy()
    expect(layer.sources.length).toBeGreaterThan(0)
    for (const s of layer.sources) expect(s.url, s.name).toMatch(/^https:\/\//)
    expect(layer.method.length).toBeGreaterThan(0)
    expect(layer.breakdown.parts.length).toBeGreaterThan(1)
    expect(layer.sample.lo).toBeLessThan(layer.sample.hi)
    expect(YEARS).toContain(layer.data.firstYear)
    expect(YEARS).toContain(layer.data.lastYear)
    expect(layer.data.firstYear).toBeLessThanOrEqual(layer.data.lastYear)
  })

  it.each(LAYERS.map((l) => [l.id, l] as const))('%s uses a known format, and a scale only on a ratio', (_, layer) => {
    expect(['count', 'decimal', 'percent', 'minutes', 'currency']).toContain(layer.format ?? 'count')
    if (layer.scale !== undefined) {
      expect(layer.aggregation).toBe('ratio')
      expect(layer.scale).toBeGreaterThan(0)
    }
  })

  it('has a unique id', () => {
    const ids = LAYERS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('layerSources', () => {
  it('adds the precinct and borough boundary credits to every layer', () => {
    for (const layer of LAYERS) {
      const urls = layerSources(layer).map((s) => s.url)
      expect(urls, layer.id).toContain('https://data.cityofnewyork.us/d/y76i-bdw7')
      expect(layerSources(layer).map((s) => s.publisher), layer.id).toContain('NYC Department of City Planning')
      expect(layerSources(layer).slice(0, layer.sources.length)).toEqual([...layer.sources])
    }
  })

  it('points each layer at the dataset the audit verified', () => {
    const urls = (id: string) => layerSources(getLayer(id)).map((s) => s.url).join(' ')
    expect(urls('structural-fires')).toContain('8m42-w767')
    expect(urls('ems-calls')).toContain('76xm-jjuj')
    expect(urls('population-density')).toContain('acs/summary_file')
    expect(urls('population-density')).toContain('PL_94-171')
  })
})

describe('layerMethod', () => {
  it('adds the 105 & 116 caveat to layers whose areas merge them', () => {
    expect(layerMethod(getLayer('structural-fires')).join(' ')).toMatch(/105 and 116/)
    expect(layerMethod(getLayer('population-density')).join(' ')).not.toMatch(/105 and 116/)
  })

  it('adds the partial-year caveat to layers that reach the final year', () => {
    expect(layerMethod(getLayer('ems-calls'))).toContain('2026 covers January to June.')
    expect(layerMethod(getLayer('population-density')).join(' ')).not.toMatch(/2026 covers/)
  })

  it('keeps the layer’s own caveats first', () => {
    const layer = getLayer('structural-fires')
    expect(layerMethod(layer).slice(0, layer.method.length)).toEqual([...layer.method])
  })
})
