import type { StoryKey } from '../theme/tokens'

export type StoryId = StoryKey

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const
export type Year = (typeof YEARS)[number]

/** The final year has data through this month (0 = January). */
export const FINAL_YEAR_LAST_MONTH = 5

export function isYear(n: number): n is Year {
  return (YEARS as readonly number[]).includes(n)
}

export const FINAL_YEAR = YEARS[YEARS.length - 1]

export function yearLabel(year: Year): string {
  return year === FINAL_YEAR ? `${year} (Jan–Jun)` : String(year)
}

export const METHOD_URL = 'https://github.com/nomotonyc/nyc-data-general/blob/main/data-sources.md'

export type Story = {
  id: StoryId
  number: string
  name: string
  question: string
}

/** The three chapters. Each story's layers live in src/layers. */
export const STORIES: readonly Story[] = [
  { id: 'demographic', number: '01', name: 'Demographic', question: 'Who lives where' },
  { id: 'fire', number: '02', name: 'Fire', question: 'Where fires start, and why' },
  { id: 'medical', number: '03', name: 'Medical', question: 'How fast help arrives' },
]

export function getStory(id: StoryId): Story {
  const story = STORIES.find((s) => s.id === id)
  if (!story) throw new Error(`Unknown story ${id}`)
  return story
}
