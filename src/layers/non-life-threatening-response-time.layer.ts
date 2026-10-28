import type { Metric } from './types'

const seconds = 'incident_response_seconds_qy'

export default {
  id: 'non-life-threatening-response-time',
  story: 'medical',
  order: 3,
  label: 'Non-life-threatening response time',
  note: 'Average minutes for an ambulance to reach a non-life-threatening emergency',
  measure: 'Average minutes from a non-life-threatening call entering FDNY’s EMS dispatch system to the first ambulance arriving',
  unit: 'minutes',
  format: 'minutes',
  aggregation: 'ratio',
  scale: 1 / 60,
  geographies: ['divisions', 'precincts', 'battalions', 'neighborhoods'],
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
      used: 'Ambulance response times to non-life-threatening calls by precinct and month',
    },
    {
      name: 'Reviving EMS',
      publisher: 'Citizens Budget Commission',
      url: 'https://cbcny.org/research/reviving-ems',
      used: 'Which FDNY segments count as non-life-threatening (4 to 8)',
    },
  ],
  method: [
    'Non-life-threatening calls only: those dispatched as FDNY segments 4 to 8, including lower-priority calls that may wait in a queue. Calls upgraded only after an ambulance was sent remain grouped by their initial dispatch priority.',
    'Averages FDNY’s incident response time: from the call entering the EMS dispatch system to the first ambulance signalling it has arrived, for responses whose times FDNY marks valid.',
    'The Mayor’s Management Report’s figure is end-to-end, starting when the 911 call is answered, so it runs a few minutes longer than this one.',
  ],
  build: {
    kind: 'open-data-counts',
    dataset: '76xm-jjuj',
    // FDNY segments 4 to 8 are non-life-threatening; the initial severity is the priority dispatched with.
    where:
      "initial_severity_level_code IN ('4', '5', '6', '7', '8') AND valid_incident_rspns_time_indc = 'Y' AND " +
      "incident_disposition_code IN ('82', '83', '90', '91', '92', '93', '94', '95', '96')",
    dateField: 'incident_datetime',
    precinctField: 'policeprecinct',
    zipField: 'zipcode',
    districtFields: { community: 'communitydistrict', council: 'citycouncildistrict' },
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
  sample: { lo: 700, hi: 2200, seasonality: { amplitude: 0.1, peakMonth: 0 } },
} satisfies Metric
