import type { Metric } from './types'

export default {
  id: 'health-insurance-coverage',
  story: 'demographic',
  order: 3,
  label: 'Health insurance coverage',
  note: 'Insured share of the civilian noninstitutionalized population',
  measure: 'Share of the civilian noninstitutionalized population with health insurance coverage',
  unit: '% insured',
  format: 'percent',
  aggregation: 'ratio',
  scale: 100,
  zeroDenominator: true,
  geographies: ['divisions', 'precincts', 'battalions', 'neighborhoods'],
  data: { resolution: 'year', firstYear: 2024, lastYear: 2024 },
  breakdown: { title: 'Coverage status', parts: ['Insured', 'Uninsured'] },
  sources: [
    {
      name: 'American Community Survey 5-year estimates, table B27001 (health insurance by sex and age)',
      publisher: 'U.S. Census Bureau',
      url: 'https://api.census.gov/data/2024/acs/acs5/groups/B27001.html',
      used: 'Insured and uninsured population by census tract, 2024 release',
    },
  ],
  method: [
    'The numerator is the B27001 civilian noninstitutionalized population with coverage; the denominator is the same table’s total civilian noninstitutionalized population.',
    'Each tract’s insured and uninsured counts are allocated to mapped areas by the share of the tract’s 2020 census-block population in each area. Area, borough and city percentages divide summed insured counts by summed population, not an average of tract or area percentages.',
    'ACS 2024 is a 5-year estimate averaging 2020–2024 responses. It is one release, not a year-by-year time series.',
    'Areas with a zero ACS denominator have no resident population to measure; the app represents that undefined percentage as 0%.',
  ],
  build: {
    kind: 'census-density',
    indicator: 'insurance',
    blocks: 'https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/ny2020.pl.zip',
    acs: 'https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-b27001.dat',
  },
  sample: { lo: 70, hi: 100 },
} satisfies Metric
