import type { Metric } from './types'

export default {
  id: 'ems-calls',
  story: 'medical',
  order: 1,
  label: 'EMS calls',
  note: 'Medical emergencies FDNY EMS was dispatched to',
  unit: 'calls',
  aggregation: 'sum',
  data: { resolution: 'month', areas: 'dispatch', firstYear: 2019, lastYear: 2026 },
  breakdown: {
    title: 'Call type',
    parts: ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other'],
  },
  sources: [
    {
      name: 'EMS Incident Dispatch Data',
      publisher: 'FDNY, via NYC Open Data',
      url: 'https://data.cityofnewyork.us/d/76xm-jjuj',
      used: 'EMS incidents by precinct, month and call type, with FDNY’s call type descriptions',
    },
  ],
  method: [
    'Counts every EMS incident by the precinct and month recorded.',
    'About 1% of calls have no precinct and are left out.',
    'Call types are grouped from FDNY’s 185 call type codes using the descriptions published with the dataset.',
  ],
  sample: { lo: 600, hi: 50000, seasonality: { amplitude: 0.12, peakMonth: 6 } },
} satisfies Metric
