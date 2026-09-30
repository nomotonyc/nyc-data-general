import type { Metric } from './types'

export default {
  id: 'structural-fires',
  story: 'fire',
  order: 1,
  label: 'Structural fires',
  note: 'Fires in buildings FDNY was dispatched to',
  unit: 'fires',
  aggregation: 'sum',
  data: { resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 },
  breakdown: {
    title: 'Building type',
    parts: ['Apartment building', 'Hotel, shelter or SRO', 'House', 'Commercial', 'Public or institutional', 'Vacant or under construction'],
  },
  sources: [
    {
      name: 'Fire Incident Dispatch Data',
      publisher: 'FDNY, via NYC Open Data',
      url: 'https://data.cityofnewyork.us/d/8m42-w767',
      used: 'Structural fires by precinct, month and building type',
    },
  ],
  method: [
    'Counts dispatches whose classification group is “Structural Fires”, by the precinct and month recorded.',
    'About 0.5% of fires have no precinct and are left out, so totals run slightly under FDNY’s citywide figures.',
  ],
  sample: { lo: 30, hi: 700, seasonality: { amplitude: 0.22, peakMonth: 0 } },
} satisfies Metric
