import { describe, expect, it } from 'vitest'
import { lightTheme } from '../theme/tokens'
import { METHOD_URL, STORIES, YEARS, findMetric, getStory, isYear, yearLabel } from './stories'

describe('STORIES', () => {
  it('runs Demographic, Fire, Medical as chapters 01 to 03', () => {
    expect(STORIES.map((s) => [s.number, s.id, s.name])).toEqual([
      ['01', 'demographic', 'Demographic'],
      ['02', 'fire', 'Fire'],
      ['03', 'medical', 'Medical'],
    ])
  })

  it('asks the question from the spec for each story', () => {
    expect(STORIES.map((s) => s.question)).toEqual([
      'Who lives where',
      'Where fires start, and why',
      'How fast help arrives',
    ])
  })

  it('has one layer per story for now', () => {
    expect(STORIES.map((s) => s.metrics.map((m) => m.label))).toEqual([
      ['Population density'],
      ['Structural fires'],
      ['EMS calls'],
    ])
  })

  it('computes density as a ratio and counts as sums', () => {
    expect(getStory('demographic').metrics[0].aggregation).toBe('ratio')
    expect(getStory('fire').metrics[0].aggregation).toBe('sum')
    expect(getStory('medical').metrics[0].aggregation).toBe('sum')
  })

  it('declares the time detail, areas and years each source supports', () => {
    expect(getStory('demographic').data).toEqual({ resolution: 'year', areas: 'precincts', firstYear: 2021, lastYear: 2024 })
    for (const id of ['fire', 'medical'] as const) {
      expect(getStory(id).data).toEqual({ resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 })
    }
  })

  it('names the breakdown parts from the spec', () => {
    expect(STORIES.map((s) => [s.breakdown.title, s.breakdown.parts])).toEqual([
      ['Age mix', ['Under 18', '18–34', '35–64', '65 and over']],
      [
        'Building type',
        ['Apartment building', 'Hotel, shelter or SRO', 'House', 'Commercial', 'Public or institutional', 'Vacant or under construction'],
      ],
      [
        'Call type',
        ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other'],
      ],
    ])
  })

  it('has a palette for every story', () => {
    for (const s of STORIES) expect(lightTheme.story[s.id], s.id).toBeDefined()
  })
})

describe('layer sources', () => {
  const layers = STORIES.flatMap((s) => s.metrics)

  it('lists at least one https source and some method text for every layer', () => {
    for (const m of layers) {
      expect(m.sources.length, m.id).toBeGreaterThan(0)
      for (const s of m.sources) {
        expect(s.url, `${m.id} ${s.name}`).toMatch(/^https:\/\//)
        expect(s.name && s.publisher && s.used, `${m.id} ${s.name}`).toBeTruthy()
      }
      expect(m.method.length, m.id).toBeGreaterThan(0)
    }
  })

  it('credits the precinct boundaries on every layer', () => {
    for (const m of layers) expect(m.sources.map((s) => s.url), m.id).toContain('https://data.cityofnewyork.us/d/y76i-bdw7')
  })

  it('credits the borough boundaries on every layer, since the map no longer shows a credit', () => {
    for (const m of layers) expect(m.sources.map((s) => s.publisher), m.id).toContain('NYC Department of City Planning')
  })

  it('points each layer at the dataset the audit verified', () => {
    const urls = (id: 'demographic' | 'fire' | 'medical') => getStory(id).metrics[0].sources.map((s) => s.url).join(' ')
    expect(urls('fire')).toContain('8m42-w767')
    expect(urls('medical')).toContain('76xm-jjuj')
    expect(urls('demographic')).toContain('acs/summary_file')
    expect(urls('demographic')).toContain('PL_94-171')
  })

  it('links to the full method document', () => {
    expect(METHOD_URL).toBe('https://github.com/nomotonyc/nyc-data-general/blob/main/data-sources.md')
  })
})

describe('findMetric', () => {
  it('finds a layer in its own story only', () => {
    expect(findMetric(getStory('fire'), 'structural-fires')?.label).toBe('Structural fires')
    expect(findMetric(getStory('medical'), 'structural-fires')).toBeUndefined()
  })
})

describe('years', () => {
  it('covers 2019 to 2026', () => {
    expect(YEARS).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])
    expect(isYear(2026)).toBe(true)
    expect(isYear(2018)).toBe(false)
    expect(isYear(2027)).toBe(false)
    expect(isYear(2021.5)).toBe(false)
  })

  it('labels the partial final year', () => {
    expect(yearLabel(2026)).toBe('2026 (Jan–Jun)')
    expect(yearLabel(2025)).toBe('2025')
  })
})
