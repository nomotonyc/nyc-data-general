import type { Metric } from './types'

/**
 * How officers typed a fire truck, engine or ladder in the crash report's vehicle type, as
 * seen 2019–2026 (upper-cased; the field keeps 10 characters, typos included). Left out:
 * ambulances (FDNY AMBUL, FDNY EMS), tankers, and wordings that could be any FDNY vehicle
 * (FDNY, FDNY CHIEF, FIRE DEPT); FRIEGHTLIN and PUMP are truck makes and concrete pumps.
 */
const FIRE_APPARATUS = [
  'ENGIN', 'ENGINE', 'ENGINE 26', 'FD APPARAT', 'FD ENGINE', 'FD LADDER', 'FD TR', 'FD TRUCK',
  'FDNY 245 E', 'FDNY 331 K', 'FDNY ENGIN', 'FDNY FIRE', 'FDNY FIRET', 'FDNY LADDE', 'FDNY LADER',
  'FDNY RIG', 'FDNY TRUCK', 'FDNY- FIRE', 'FDNY285 EN', 'FDNYLADDER', 'FDNYTRUCKF', 'FIRE',
  'FIRE APPAR', 'FIRE ENGIN', 'FIRE LADDE', 'FIRE RIG T', 'FIRE RUCK', 'FIRE TRUCK', 'FIRE TRUVK',
  'FIRE TURCK', 'FIRE-TRUCK', 'FIRET', 'FIRET TRUC', 'FIRETRUCK', 'FIRETURCK', 'LADDE', 'LADDER',
  'LADDER 169', 'LADDER CO', 'LADDER TRU', 'NYC FDNY #', 'NYC FIRE T', 'NYC FIRETR', 'PUMPER',
  'PUMPER TRU', 'RESCUE TRU',
]

const vehicleFields = ['vehicle_type_code1', 'vehicle_type_code2', 'vehicle_type_code_3']
const listed = FIRE_APPARATUS.map((v) => `'${v}'`).join(', ')

export default {
  id: 'fire-apparatus-accidents',
  story: 'fire',
  order: 2,
  label: 'Fire apparatus accidents',
  note: 'Police-reported crashes involving a fire truck',
  measure: 'Police-reported crashes involving an FDNY fire truck, engine or ladder',
  unit: 'crashes',
  aggregation: 'sum',
  data: { resolution: 'month', firstYear: 2019, lastYear: 2026 },
  breakdown: { title: 'Injuries', parts: ['No one hurt', 'Someone injured', 'Someone killed'] },
  sources: [
    {
      name: 'Motor Vehicle Collisions – Crashes',
      publisher: 'NYPD, via NYC Open Data',
      url: 'https://data.cityofnewyork.us/d/h9gi-nx95',
      used: 'Crashes with a fire truck among the first three vehicles, with location and injuries',
    },
  ],
  method: [
    'Counts crashes where the police report lists a fire truck, engine or ladder as one of the first three vehicles. Vehicle types are typed by officers, so the build matches 46 spellings; plain “FDNY” and FDNY ambulances are left out because they could be other vehicles.',
    'Only crashes police reported are included: anyone hurt or killed, or at least $1,000 of damage.',
    'Crashes are placed in precincts by their coordinates; about 5% have none and are left out.',
    'Numbers are small, a few a year in most precincts, so differences between precincts are not meaningful on their own.',
  ],
  build: {
    kind: 'open-data-points',
    dataset: 'h9gi-nx95',
    where: vehicleFields.map((f) => `upper(trim(${f})) IN (${listed})`).join(' OR '),
    dateField: 'crash_date',
    latitudeField: 'latitude',
    longitudeField: 'longitude',
    partField:
      "case(number_of_persons_killed > 0, 'Someone killed', number_of_persons_injured > 0, 'Someone injured', true, 'No one hurt')",
    parts: {
      'No one hurt': ['No one hurt'],
      'Someone injured': ['Someone injured'],
      'Someone killed': ['Someone killed'],
    },
  },
  sample: { lo: 0, hi: 8 },
} satisfies Metric
