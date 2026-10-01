import { describe, expect, it } from 'vitest'
import { STORIES, YEARS } from '../domain/stories'
import { LAYERS, getLayer, layerMethod, layerSources, layersOf } from '.'

describe('the layer registry', () => {
  // These checks name layers one at a time, so adding a layer file never means editing tests.
  it('finds the layer files', () => {
    expect(LAYERS.map((l) => l.id)).toEqual(expect.arrayContaining(['population-density', 'structural-fires', 'ambulance-calls']))
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
    expect(getLayer('ambulance-calls').label).toBe('Ambulance calls')
    expect(() => getLayer('nope')).toThrow(/nope/)
  })
})

describe('the three layers', () => {
  it.each([
    ['population-density', 'demographic', 'Population density', 'Residents per square mile of land'],
    ['structural-fires', 'fire', 'Structural fires', 'Fires in buildings FDNY was dispatched to'],
    ['ambulance-calls', 'medical', 'Ambulance calls', 'Medical emergencies ambulances responded to'],
  ])('%s has its story, title and subtitle from the spec', (id, story, label, note) => {
    expect(getLayer(id)).toMatchObject({ story, label, note })
  })

  it.each([
    ['structural-fires', 'Incidents FDNY was dispatched to and classified as structural fires'],
    ['ambulance-calls', 'Medical emergencies ambulances responded to'],
    ['population-density', 'Residents per square mile of land, from Census Bureau estimates'],
  ])('%s says exactly what it measures', (id, measure) => {
    expect(getLayer(id).measure).toBe(measure)
  })

  it('compute density as a ratio and counts as sums', () => {
    expect(getLayer('population-density').aggregation).toBe('ratio')
    expect(getLayer('structural-fires').aggregation).toBe('sum')
    expect(getLayer('ambulance-calls').aggregation).toBe('sum')
  })

  it('declare the time detail, areas and years each source supports', () => {
    expect(getLayer('population-density').data).toEqual({ resolution: 'year', firstYear: 2021, lastYear: 2024 })
    for (const id of ['structural-fires', 'ambulance-calls']) {
      expect(getLayer(id).data).toEqual({ resolution: 'month', firstYear: 2019, lastYear: 2026 })
    }
  })

  it.each([
    ['population-density', 'Age mix', ['Under 18', '18–34', '35–64', '65 and over']],
    ['structural-fires', 'Building type', ['Apartment building', 'Hotel, shelter or SRO', 'House', 'Commercial', 'Public or institutional', 'Vacant or under construction']],
    ['ambulance-calls', 'Call type', ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other']],
  ])('%s has its breakdown from the spec', (id, title, parts) => {
    expect(getLayer(id).breakdown).toEqual({ title, parts })
  })
})

describe('every layer file', () => {
  it.each(LAYERS.map((l) => [l.id, l] as const))('%s is complete', (_, layer) => {
    expect(layer.id).toMatch(/^[a-z0-9-]+$/)
    expect(STORIES.map((s) => s.id)).toContain(layer.story)
    expect(layer.label && layer.note && layer.unit && layer.measure).toBeTruthy()
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
    expect(urls('ambulance-calls')).toContain('76xm-jjuj')
    expect(urls('population-density')).toContain('acs/summary_file')
    expect(urls('population-density')).toContain('PL_94-171')
  })
})

describe('layerMethod', () => {
  it('says how 105 and 116 are split for layers built from dispatch records', () => {
    expect(layerMethod(getLayer('structural-fires'))).toContain(
      'Precincts 105 and 116 are told apart by ZIP code: NYPD created 116 from 105 in late 2024, and older records still say 105.',
    )
    expect(layerMethod(getLayer('population-density')).join(' ')).not.toMatch(/105 and 116/)
  })

  it('adds the partial-year caveat to layers that reach the final year', () => {
    expect(layerMethod(getLayer('ambulance-calls'))).toContain('2026 covers January to June.')
    expect(layerMethod(getLayer('population-density')).join(' ')).not.toMatch(/2026 covers/)
  })

  it('keeps the layer’s own caveats first', () => {
    const layer = getLayer('structural-fires')
    expect(layerMethod(layer).slice(0, layer.method.length)).toEqual([...layer.method])
  })
})

describe('build configs', () => {
  const built = LAYERS.filter((l) => l.build)

  it('builds structural fires from Fire Incident Dispatch Data', () => {
    expect(getLayer('structural-fires').build).toMatchObject({
      kind: 'open-data-counts',
      dataset: '8m42-w767',
      where: "incident_classification_group = 'Structural Fires'",
      dateField: 'incident_datetime',
      precinctField: 'policeprecinct',
      zipField: 'zipcode',
      partField: 'incident_classification',
    })
  })

  it('files each fire classification under the building type the audit gives it', () => {
    const parts = getLayer('structural-fires').build!.parts
    expect(parts['Hotel, shelter or SRO']).toEqual(["Multiple Dwelling 'B' Fire"])
    expect(parts['House']).toEqual(['Private Dwelling Fire'])
    expect(Object.values(parts).flat()).toHaveLength(17)
  })

  it.each(built.map((l) => [l.id, l] as const))('%s groups raw values under exactly the breakdown parts', (_, layer) => {
    expect(Object.keys(layer.build!.parts)).toEqual([...layer.breakdown.parts])
  })

  it.each(built.map((l) => [l.id, l] as const))('%s puts each raw value in one part only', (_, layer) => {
    const values = Object.values(layer.build!.parts).flat()
    expect(new Set(values).size).toBe(values.length)
  })

  it.each(built.map((l) => [l.id, l] as const))('%s only builds counts from the source it credits', (_, layer) => {
    expect(layer.aggregation).toBe('sum')
    expect(layer.sources.map((s) => s.url).join(' ')).toContain(layer.build!.dataset)
  })
})
