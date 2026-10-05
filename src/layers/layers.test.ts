import { describe, expect, it } from 'vitest'
import { STORIES, YEARS } from '../domain/stories'
import { LAYERS, getLayer, layerGeographies, layerMethod, layerSources, layersOf, type OpenDataCountsBuild, type OpenDataPointsBuild } from '.'
import fdnyCallTypes from './fdny-ems-call-types.json'

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

  it('counts ambulance responses', () => {
    expect(getLayer('ambulance-calls').unit).toBe('responses')
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

describe('battalion placement sources', () => {
  const urls = (id: string) => layerSources(getLayer(id)).map((s) => s.url).join(' ')

  it('credits every dataset used to estimate battalion shares from residents', () => {
    for (const id of ['structural-fires', 'ambulance-calls', 'ambulance-response-time']) {
      expect(urls(id), id).toContain('PL_94-171')
      expect(urls(id), id).toContain('pri4-ifjk')
      expect(urls(id), id).toContain('5crt-au7u')
      expect(urls(id), id).toContain('872g-cjhh')
    }
  })

  it('credits the alarm box locations and Geoclient where fires are placed by alarm box', () => {
    expect(urls('structural-fires')).toContain('v57i-gtxb')
    expect(urls('structural-fires')).toContain('geoclient')
    expect(urls('ambulance-calls')).not.toContain('v57i-gtxb')
  })

  it('adds nothing for layers placed exactly from their own data, and never lists a source twice', () => {
    expect(urls('fire-apparatus-accidents')).not.toContain('pri4-ifjk')
    for (const layer of LAYERS) {
      const list = layerSources(layer).map((s) => s.url)
      expect(new Set(list).size, layer.id).toBe(list.length)
    }
  })
})

describe('battalion boundary credit', () => {
  it('credits the Fire Battalions boundaries on layers shown by battalion, and only those', () => {
    for (const layer of LAYERS) {
      const credited = layerSources(layer).some((s) => s.url === 'https://data.cityofnewyork.us/d/xzng-ft6f')
      expect(credited, layer.id).toBe(layerGeographies(layer).includes('battalions'))
    }
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
  // Layers built from Open Data records, whose build lists the raw values in each part.
  const built = LAYERS.flatMap((l) => (l.build && l.build.kind !== 'census-density' ? [{ ...l, build: l.build }] : []))

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
    const parts = (getLayer('structural-fires').build as OpenDataCountsBuild).parts
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

  it.each(built.map((l) => [l.id, l] as const))('%s builds from the source it credits', (_, layer) => {
    expect(layer.sources.map((s) => s.url).join(' ')).toContain(layer.build!.dataset)
  })

  it.each(built.map((l) => [l.id, l] as const))('%s sums a field exactly when it is a ratio', (_, layer) => {
    expect(layer.build!.sumField !== undefined).toBe(layer.aggregation === 'ratio')
  })
})

describe('the ambulance calls build', () => {
  const build = getLayer('ambulance-calls').build as OpenDataCountsBuild

  it('counts EMS incidents from EMS Incident Dispatch Data', () => {
    expect(build).toMatchObject({
      kind: 'open-data-counts',
      dataset: '76xm-jjuj',
      dateField: 'incident_datetime',
      precinctField: 'policeprecinct',
      zipField: 'zipcode',
      partField: 'final_call_type',
    })
  })

  it('counts only incidents an ambulance responded to, including patient gone and no emergency found', () => {
    expect(build.where).toBe("incident_disposition_code IN ('82', '83', '90', '91', '92', '93', '94', '95', '96')")
  })

  it('puts every call type in FDNY’s dictionary in exactly one part', () => {
    const grouped = Object.values(build.parts).flat()
    expect([...grouped].sort()).toEqual(Object.keys(fdnyCallTypes).sort())
  })

  it.each([
    ['CARDBR', 'Breathing or cardiac'],
    ['ARREST', 'Breathing or cardiac'],
    ['SHOT', 'Injury'],
    ['EDPC', 'Psychiatric'],
    ['DRUG', 'Drugs or alcohol'],
    ['UNC', 'Unconscious or altered'],
    ['CVAC', 'Illness'],
    ['UNKNOW', 'Unknown or other'],
    ['T-ARST', 'Breathing or cardiac'],
    ['SICKFC', 'Illness'],
  ])('files %s under %s', (code, part) => {
    expect(build.parts[part]).toContain(code)
  })
})

describe('ambulance response time', () => {
  const layer = getLayer('ambulance-response-time')

  it('says it starts later than the city’s end-to-end figure', () => {
    expect(layer.method.join(' ')).toMatch(/Mayor’s Management Report/)
    expect(layer.sources.map((s) => s.url)).toContain('https://cbcny.org/research/reviving-ems')
  })

  it('is the Medical story’s second layer', () => {
    expect(layersOf('medical').map((l) => l.id)).toEqual(['ambulance-calls', 'ambulance-response-time'])
    expect(layer).toMatchObject({
      label: 'Life-threatening response time',
      note: 'Average minutes for an ambulance to reach a life-threatening emergency',
      measure: 'Average minutes from a life-threatening call entering FDNY’s EMS dispatch system to the first ambulance arriving',
      unit: 'minutes',
      format: 'minutes',
      aggregation: 'ratio',
      scale: 1 / 60,
    })
  })

  it('averages valid response times to life-threatening calls an ambulance responded to', () => {
    expect(layer.build).toMatchObject({
      dataset: '76xm-jjuj',
      where:
        "initial_severity_level_code IN ('1', '2', '3') AND valid_incident_rspns_time_indc = 'Y' AND " +
        "incident_disposition_code IN ('82', '83', '90', '91', '92', '93', '94', '95', '96')",
      sumField: 'incident_response_seconds_qy',
    })
  })

  it('breaks responses down by how long they took', () => {
    expect(layer.breakdown).toEqual({
      title: 'How long responses took',
      parts: ['Under 5 minutes', '5 to 10 minutes', '10 to 15 minutes', '15 to 20 minutes', '20 minutes or more'],
    })
    expect((layer.build as OpenDataCountsBuild).partField).toBe(
      "case(incident_response_seconds_qy < 300, 'Under 5 minutes', incident_response_seconds_qy < 600, '5 to 10 minutes', " +
        "incident_response_seconds_qy < 900, '10 to 15 minutes', incident_response_seconds_qy < 1200, '15 to 20 minutes', " +
        "true, '20 minutes or more')",
    )
  })
})

describe('fire apparatus accidents', () => {
  const layer = getLayer('fire-apparatus-accidents')
  const build = layer.build as OpenDataPointsBuild

  it('is the Fire story’s second layer', () => {
    expect(layersOf('fire').map((l) => l.id)).toEqual(['structural-fires', 'fire-apparatus-accidents'])
    expect(layer).toMatchObject({
      label: 'Fire apparatus accidents',
      note: 'Police-reported crashes involving a fire truck',
      measure: 'Police-reported crashes involving an FDNY fire truck, engine or ladder',
      unit: 'crashes',
      aggregation: 'sum',
    })
  })

  it('locates crashes from the Motor Vehicle Collisions data', () => {
    expect(build).toMatchObject({ kind: 'open-data-points', dataset: 'h9gi-nx95', dateField: 'crash_date', latitudeField: 'latitude', longitudeField: 'longitude' })
  })

  it('matches fire apparatus in vehicle type codes 1 to 3, however it was typed', () => {
    for (const field of ['vehicle_type_code1', 'vehicle_type_code2', 'vehicle_type_code_3']) expect(build.where).toContain(`upper(trim(${field})) IN (`)
    for (const v of ['FIRE TRUCK', 'FIRETRUCK', 'FDNY FIRET', 'FIRE ENGIN', 'LADDER TRU', 'FIRE TRUVK']) expect(build.where).toContain(`'${v}'`)
  })

  it('leaves out ambulances, tankers and vehicles that could be any FDNY car', () => {
    for (const v of ['TANKER', 'FDNY AMBUL', 'FDNY EMS', 'FDNY', 'FDNY CHIEF', 'FIRE DEPT', 'FRIEGHTLIN', 'PUMP']) expect(build.where).not.toContain(`'${v}'`)
  })

  it('breaks crashes down by their worst injury', () => {
    expect(layer.breakdown).toEqual({ title: 'Injuries', parts: ['No one hurt', 'Someone injured', 'Someone killed'] })
  })
})

describe('the population density build', () => {
  const layer = getLayer('population-density')

  it('uses 2020 census blocks and ACS 5-year age tables', () => {
    expect(layer.build).toEqual({
      kind: 'census-density',
      blocks: 'https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/ny2020.pl.zip',
      acs: 'https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-b01001.dat',
    })
  })

  it('credits the files it is built from', () => {
    const urls = layer.sources.map((s) => s.url).join(' ')
    expect(urls).toContain('ny2020.pl.zip')
    expect(urls).toContain('acs/summary_file')
    expect(layer.sources.map((s) => s.name).join(' ')).toContain('B01001')
  })
})
