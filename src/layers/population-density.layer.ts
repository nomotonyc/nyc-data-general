import type { Metric } from './types'

export default {
  id: 'population-density',
  story: 'demographic',
  order: 1,
  label: 'Population density',
  note: 'Residents per square mile of land',
  measure: 'Residents per square mile of land, from Census Bureau estimates',
  unit: 'people per sq mi',
  aggregation: 'ratio',
  data: { resolution: 'year', firstYear: 2021, lastYear: 2024 },
  breakdown: { title: 'Age mix', parts: ['Under 18', '18–34', '35–64', '65 and over'] },
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
  ],
  method: [
    'Each 2020 census block is assigned to the precinct containing its interior point.',
    'Each census tract’s ACS population is split among precincts in proportion to the 2020 population of its blocks in each.',
    'Density is population divided by land area; water is excluded. Boroughs, the city and ranges of years use total population over total land, not an average of densities.',
    'ACS figures are 5-year estimates: “2024” averages 2020–2024 responses. Only 2021–2024 are available; other years show the nearest one.',
  ],
  sample: { lo: 5000, hi: 120000 },
} satisfies Metric
