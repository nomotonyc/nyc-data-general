import type { StoryKey } from '../theme/tokens'

export type StoryId = StoryKey

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const
export type Year = (typeof YEARS)[number]

/** The final year has data through this month (0 = January). */
export const FINAL_YEAR_LAST_MONTH = 5

export function isYear(n: number): n is Year {
  return (YEARS as readonly number[]).includes(n)
}

const FINAL_YEAR = YEARS[YEARS.length - 1]

export function yearLabel(year: Year): string {
  return year === FINAL_YEAR ? `${year} (Jan–Jun)` : String(year)
}

export const METHOD_URL = 'https://github.com/nomotonyc/nyc-data-general/blob/main/data-sources.md'

export type Source = {
  name: string
  publisher: string
  url: string
  /** What this layer takes from the source, in a few words. */
  used: string
}

export type Metric = {
  id: string
  label: string
  /** One line under the label in the layer picker. */
  note: string
  unit: string
  /** sum: counts add up. ratio: numerators and denominators add up separately, then divide. */
  aggregation: 'sum' | 'ratio'
  sources: readonly [Source, ...Source[]]
  /** Plain sentences for "How this is calculated". */
  method: readonly string[]
}

/** What the story's sources support. All its layers share it. */
export type StoryData = {
  resolution: 'month' | 'year'
  /** 'dispatch' merges precincts 105 and 116; see DISPATCH_AREAS. */
  areas: 'precincts' | 'dispatch'
  firstYear: Year
  lastYear: Year
}

export type Story = {
  id: StoryId
  number: string
  name: string
  question: string
  data: StoryData
  metrics: readonly [Metric, ...Metric[]]
  breakdown: { title: string; parts: readonly string[] }
}

const PRECINCT_BOUNDARIES: Source = {
  name: 'Police Precincts',
  publisher: 'NYPD, via NYC Open Data',
  url: 'https://data.cityofnewyork.us/d/y76i-bdw7',
  used: 'Precinct boundaries',
}

const BOROUGH_BOUNDARIES: Source = {
  name: 'Borough Boundaries',
  publisher: 'NYC Department of City Planning',
  url: 'https://www.nyc.gov/site/planning/',
  used: 'Borough outlines',
}

export const STORIES: readonly Story[] = [
  {
    id: 'demographic',
    number: '01',
    name: 'Demographic',
    question: 'Who lives where',
    data: { resolution: 'year', areas: 'precincts', firstYear: 2021, lastYear: 2024 },
    metrics: [
      {
        id: 'population-density',
        label: 'Population density',
        note: 'Residents per square mile of land',
        unit: 'people per sq mi',
        aggregation: 'ratio',
        sources: [
          {
            name: 'American Community Survey 5-year estimates (tables B01003, B01001)',
            publisher: 'U.S. Census Bureau',
            url: 'https://www2.census.gov/programs-surveys/acs/summary_file/',
            used: 'Population and age by census tract, 2021–2024 releases',
          },
          {
            name: '2020 Census Redistricting Data (P.L. 94-171)',
            publisher: 'U.S. Census Bureau',
            url: 'https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/',
            used: 'Census blocks: population weights, land area and location',
          },
          PRECINCT_BOUNDARIES,
          BOROUGH_BOUNDARIES,
        ],
        method: [
          'Each 2020 census block is assigned to the precinct containing its interior point.',
          'Each census tract’s ACS population is split among precincts in proportion to the 2020 population of its blocks in each.',
          'Density is population divided by land area; water is excluded. Boroughs, the city and ranges of years use total population over total land, not an average of densities.',
          'ACS figures are 5-year estimates: “2024” averages 2020–2024 responses. Only 2021–2024 are available; other years show the nearest one.',
        ],
      },
    ],
    breakdown: { title: 'Age mix', parts: ['Under 18', '18–34', '35–64', '65 and over'] },
  },
  {
    id: 'fire',
    number: '02',
    name: 'Fire',
    question: 'Where fires start, and why',
    data: { resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 },
    metrics: [
      {
        id: 'structural-fires',
        label: 'Structural fires',
        note: 'Fires in buildings FDNY was dispatched to',
        unit: 'fires',
        aggregation: 'sum',
        sources: [
          {
            name: 'Fire Incident Dispatch Data',
            publisher: 'FDNY, via NYC Open Data',
            url: 'https://data.cityofnewyork.us/d/8m42-w767',
            used: 'Structural fires by precinct, month and building type',
          },
          PRECINCT_BOUNDARIES,
          BOROUGH_BOUNDARIES,
        ],
        method: [
          'Counts dispatches whose classification group is “Structural Fires”, by the precinct and month recorded.',
          'About 0.5% of fires have no precinct and are left out, so totals run slightly under FDNY’s citywide figures.',
          'Precincts 105 and 116 are shown together because the dispatch data does not separate them consistently since the 2024 split.',
          '2026 covers January to June.',
        ],
      },
    ],
    breakdown: {
      title: 'Building type',
      parts: ['Apartment building', 'Hotel, shelter or SRO', 'House', 'Commercial', 'Public or institutional', 'Vacant or under construction'],
    },
  },
  {
    id: 'medical',
    number: '03',
    name: 'Medical',
    question: 'How fast help arrives',
    data: { resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 },
    metrics: [
      {
        id: 'ems-calls',
        label: 'EMS calls',
        note: 'Medical emergencies FDNY EMS was dispatched to',
        unit: 'calls',
        aggregation: 'sum',
        sources: [
          {
            name: 'EMS Incident Dispatch Data',
            publisher: 'FDNY, via NYC Open Data',
            url: 'https://data.cityofnewyork.us/d/76xm-jjuj',
            used: 'EMS incidents by precinct, month and call type, with FDNY’s call type descriptions',
          },
          PRECINCT_BOUNDARIES,
          BOROUGH_BOUNDARIES,
        ],
        method: [
          'Counts every EMS incident by the precinct and month recorded.',
          'About 1% of calls have no precinct and are left out.',
          'Call types are grouped from FDNY’s 185 call type codes using the descriptions published with the dataset.',
          'Precincts 105 and 116 are shown together because the dispatch data still files most southeast Queens calls under 105.',
          '2026 covers January to June.',
        ],
      },
    ],
    breakdown: {
      title: 'Call type',
      parts: ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other'],
    },
  },
]

export function getStory(id: StoryId): Story {
  const story = STORIES.find((s) => s.id === id)
  if (!story) throw new Error(`Unknown story ${id}`)
  return story
}

export function findMetric(story: Story, metricId: string): Metric | undefined {
  return story.metrics.find((m) => m.id === metricId)
}
