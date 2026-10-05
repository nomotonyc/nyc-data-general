import type { Metric } from './types'

export default {
  id: 'structural-fires',
  story: 'fire',
  order: 1,
  label: 'Structural fires',
  note: 'Fires in buildings FDNY was dispatched to',
  measure: 'Incidents FDNY was dispatched to and classified as structural fires',
  unit: 'fires',
  aggregation: 'sum',
  geographies: ['precincts', 'battalions'],
  data: { resolution: 'month', firstYear: 2019, lastYear: 2026 },
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
  build: {
    kind: 'open-data-counts',
    dataset: '8m42-w767',
    where: "incident_classification_group = 'Structural Fires'",
    dateField: 'incident_datetime',
    precinctField: 'policeprecinct',
    zipField: 'zipcode',
    districtFields: { community: 'communitydistrict', council: 'citycouncildistrict' },
    alarmBox: { boroughField: 'alarm_box_borough', numberField: 'alarm_box_number', locationField: 'alarm_box_location' },
    partField: 'incident_classification',
    parts: {
      'Apartment building': [
        "Multiple Dwelling 'A' - Food on the stove fire",
        "Multiple Dwelling 'A' - Other fire",
        "Multiple Dwelling 'A' - Compactor fire",
      ],
      'Hotel, shelter or SRO': ["Multiple Dwelling 'B' Fire"],
      House: ['Private Dwelling Fire'],
      Commercial: ['Other Commercial Building Fire', 'Store Fire', 'Factory Fire', 'Theater or TV Studio Fire'],
      'Public or institutional': ['School Fire', 'Hospital Fire', 'Church Fire', 'Other Public Building Fire', 'Transit System - Structural'],
      // FDNY's spelling.
      'Vacant or under construction': ['Under Contruction / Vacant Fire', 'Construction or Demolition Building Fire', 'Untenanted Building Fire'],
    },
  },
  sample: { lo: 30, hi: 700, seasonality: { amplitude: 0.22, peakMonth: 0 } },
} satisfies Metric
