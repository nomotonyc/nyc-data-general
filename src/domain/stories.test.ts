import { describe, expect, it } from 'vitest'
import { lightTheme } from '../theme/tokens'
import { METHOD_URL, STORIES, YEARS, getStory, isYear, yearLabel } from './stories'

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

  it('has a palette for every story', () => {
    for (const s of STORIES) expect(lightTheme.story[s.id], s.id).toBeDefined()
  })

  it('looks stories up by id', () => {
    expect(getStory('medical').name).toBe('Medical')
  })

  it('links to the full method document', () => {
    expect(METHOD_URL).toBe('https://github.com/nomotonyc/nyc-data-general/blob/main/data-sources.md')
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
