import type { Metric } from './types'

const seconds = 'incident_response_seconds_qy'

export default {
  id: 'ambulance-response-time',
  story: 'medical',
  order: 2,
  label: 'Ambulance response time',
  note: 'Average minutes from call to first ambulance on scene',
  measure: 'Average minutes from a call entering FDNY’s dispatch system to the first ambulance arriving',
  unit: 'minutes',
  format: 'minutes',
  aggregation: 'ratio',
  scale: 1 / 60,
  data: { resolution: 'month', firstYear: 2019, lastYear: 2026 },
  breakdown: {
    title: 'How long responses took',
    parts: ['Under 5 minutes', '5 to 10 minutes', '10 to 15 minutes', '15 to 20 minutes', '20 minutes or more'],
  },
  sources: [
    {
      name: 'EMS Incident Dispatch Data',
      publisher: 'FDNY, via NYC Open Data',
      url: 'https://data.cityofnewyork.us/d/76xm-jjuj',
      used: 'Ambulance response times by precinct and month',
    },
  ],
  method: [
    'Averages FDNY’s incident response time: from the call entering the dispatch system to the first ambulance signalling it has arrived.',
    'Covers incidents an ambulance responded to whose response time FDNY marks valid; about 2% are not.',
    'All priorities are included, so places with more low-priority calls, which wait longer, average higher.',
    'An average is pulled up by a few very long waits; the breakdown shows how responses were spread.',
  ],
  build: {
    kind: 'open-data-counts',
    dataset: '76xm-jjuj',
    where: "valid_incident_rspns_time_indc = 'Y' AND incident_disposition_code IN ('82', '83', '90', '91', '92', '93', '94', '95', '96')",
    dateField: 'incident_datetime',
    precinctField: 'policeprecinct',
    zipField: 'zipcode',
    sumField: seconds,
    partField:
      `case(${seconds} < 300, 'Under 5 minutes', ${seconds} < 600, '5 to 10 minutes', ` +
      `${seconds} < 900, '10 to 15 minutes', ${seconds} < 1200, '15 to 20 minutes', ` +
      `true, '20 minutes or more')`,
    parts: {
      'Under 5 minutes': ['Under 5 minutes'],
      '5 to 10 minutes': ['5 to 10 minutes'],
      '10 to 15 minutes': ['10 to 15 minutes'],
      '15 to 20 minutes': ['15 to 20 minutes'],
      '20 minutes or more': ['20 minutes or more'],
    },
  },
  sample: { lo: 420, hi: 1100, seasonality: { amplitude: 0.08, peakMonth: 0 } },
} satisfies Metric
