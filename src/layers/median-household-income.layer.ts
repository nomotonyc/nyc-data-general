import type { Metric } from './types'

export default {
  id: 'median-household-income',
  story: 'demographic',
  order: 2,
  label: 'Median household income',
  note: 'Household-weighted tract median · 2024 dollars',
  measure: 'Household-weighted average of census-tract median household incomes, in 2024 inflation-adjusted dollars',
  unit: 'USD',
  format: 'currency',
  aggregation: 'ratio',
  zeroDenominator: true,
  geographies: ['divisions', 'precincts', 'battalions', 'neighborhoods'],
  data: { resolution: 'year', firstYear: 2024, lastYear: 2024 },
  breakdown: { title: 'Households by income', parts: ['Under $25,000', '$25,000–$49,999', '$50,000–$99,999', '$100,000 or more'] },
  sources: [
    {
      name: 'American Community Survey 5-year estimates, table B19013 (median household income)',
      publisher: 'U.S. Census Bureau',
      url: 'https://api.census.gov/data/2024/acs/acs5/groups/B19013.html',
      used: 'Tract median household income in 2024 inflation-adjusted dollars, 2024 release',
    },
    {
      name: 'American Community Survey 5-year estimates, table B11001 (household type)',
      publisher: 'U.S. Census Bureau',
      url: 'https://api.census.gov/data/2024/acs/acs5/groups/B11001.html',
      used: 'Tract household counts used to weight tract medians',
    },
    {
      name: 'American Community Survey 5-year estimates, table B19001 (household income)',
      publisher: 'U.S. Census Bureau',
      url: 'https://api.census.gov/data/2024/acs/acs5/groups/B19001.html',
      used: 'Households in four grouped income bands for the breakdown',
    },
  ],
  method: [
    'The mapped amount is an estimate: each tract’s B19013 median is weighted by its B11001 household count, then tract estimates are allocated by each area’s share of the tract’s 2020 census-block population.',
    'This produces a household-weighted average of tract medians, not a newly calculated median for the mapped area. ACS 2024 income is inflation-adjusted to 2024 dollars.',
    'Areas with no allocated ACS households have no measurable income estimate; the app represents that undefined value as $0.',
    'B19001 household counts are split among areas using the same tract population shares and grouped as under $25,000, $25,000–$49,999, $50,000–$99,999, and $100,000 or more.',
    'The 2024 ACS 5-year estimate averages responses from 2020–2024. It is one release, not a year-by-year time series.',
  ],
  build: {
    kind: 'census-density',
    indicator: 'income',
    blocks: 'https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/ny2020.pl.zip',
    acs: 'https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-b19013.dat',
    tables: {
      households: 'https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-b11001.dat',
      distribution: 'https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-b19001.dat',
    },
  },
  sample: { lo: 25000, hi: 250000 },
} satisfies Metric
