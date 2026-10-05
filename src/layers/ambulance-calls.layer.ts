import type { Metric } from './types'

export default {
  id: 'ambulance-calls',
  story: 'medical',
  order: 1,
  label: 'Ambulance calls',
  note: 'Medical emergencies ambulances responded to',
  measure: 'Medical emergencies ambulances responded to',
  unit: 'responses',
  aggregation: 'sum',
  geographies: ['precincts', 'battalions'],
  data: { resolution: 'month', firstYear: 2019, lastYear: 2026 },
  breakdown: {
    title: 'Call type',
    parts: ['Illness', 'Injury', 'Breathing or cardiac', 'Psychiatric', 'Drugs or alcohol', 'Unconscious or altered', 'Unknown or other'],
  },
  sources: [
    {
      name: 'EMS Incident Dispatch Data',
      publisher: 'FDNY, via NYC Open Data',
      url: 'https://data.cityofnewyork.us/d/76xm-jjuj',
      used: 'Ambulance calls by precinct, month and call type, with FDNY’s call type descriptions',
    },
  ],
  method: [
    'Counts EMS incidents an ambulance responded to, by the precinct and month recorded: patients transported, treated, refusing aid or gone on arrival, and calls where no emergency was found. Cancelled and duplicate calls are left out.',
    'About 1% of calls have no precinct and are left out.',
    'Call types are grouped from FDNY’s 185 call type codes using the descriptions published with the dataset.',
  ],
  build: {
    kind: 'open-data-counts',
    dataset: '76xm-jjuj',
    // Incidents an ambulance responded to: transported, pronounced dead, no emergency found, condition
    // corrected, treated, refused aid, triaged, patient gone on arrival. Not cancelled, duplicate or unsent.
    where: "incident_disposition_code IN ('82', '83', '90', '91', '92', '93', '94', '95', '96')",
    dateField: 'incident_datetime',
    precinctField: 'policeprecinct',
    zipField: 'zipcode',
    districtFields: { community: 'communitydistrict', council: 'citycouncildistrict' },
    partField: 'final_call_type',
    // FDNY's final call type codes (fdny-ems-call-types.json describes each). Fever, rash and travel
    // variants, and T- codes for text and TTY calls, go with their base code.
    parts: {
      Illness: [
        'SICK', 'ABDPN', 'STATEP', 'SICMIN', 'CVAC', 'INBLED', 'SEIZR', 'SICKFC', 'ANAPH', 'SICPED', 'OBLAB',
        'OBMAJ', 'CVA', 'GYNHEM', 'ABDPFC', 'MEDRXN', 'PEDFC', 'GYNMAJ', 'OBMIS', 'OBCOMP', 'SICMFC', 'ANAPFC',
        'HEAT', 'COLD', 'INBLFC', 'STATFC', 'CVACFC', 'OBOUT', 'SICKRF', 'SEIZFC', 'T-SICK', 'CVAFC', 'ANAPRF',
        'MEDRFC', 'ABDPRF', 'PEDRF', 'MEDRRF', 'T-ABDP', 'INBLRF', 'T-OBST', 'T-STEP', 'CVACRF', 'STATRF',
        'SICMRF', 'T-CVAC', 'CVARF', 'T-INBL', 'SEIZRF', 'SICKFT', 'INBLFT', 'ABDPFT', 'PEDFT', 'ANAPFT',
        'CVACFT', 'STATFT', 'SEIZFT', 'SICMFT', 'COVINF',
      ],
      Injury: [
        'INJURY', 'INJMAJ', 'MVAINJ', 'PEDSTR', 'INJMIN', 'STAB', 'TRAUMA', 'SHOT', 'BURNMI', 'BURNMA', 'MVA',
        'JUMPDN', 'SAFE', 'CHILDA', 'T-INJ', 'AMPMIN', 'AMPMAJ', 'BURNHZ', 'BURNHM', 'T-SHOT', 'T-TRMA',
        'T-STAB', 'T-MVAI', 'MVAINM', 'MVAINS', 'PEDSTS', 'TRAUMS', 'ELECT', 'DROWN', 'INHALE', 'VENOM',
        'PD13C', 'PD13',
      ],
      'Breathing or cardiac': [
        'CARDBR', 'CARD', 'DIFFBR', 'ARREST', 'CDBRFC', 'RESPIR', 'DIFFFC', 'ASTHMB', 'RESPFC', 'CARDFC',
        'CHOKE', 'ASTHFC', 'ARREFC', 'RESCUE', 'T-DFBR', 'CDBRRF', 'CHOKFC', 'T-ARST', 'DIFFRF', 'CARDRF',
        'T-CARD', 'T-CDBR', 'RESPRF', 'T-ASTH', 'ASTHRF', 'ARRERF', 'CDBRFT', 'CARDFT', 'DIFFFT', 'ARREFT',
        'CHOKRF', 'ASTHFT', 'RESPFT', 'HYPTN',
      ],
      Psychiatric: [
        'EDP', 'EDPC', 'EDPM', 'EDPT', 'T-EDP', 'EDPE', 'EDPW', 'JUMPUP',
      ],
      'Drugs or alcohol': [
        'DRUG', 'DRUGFC', 'DRUGRF', 'DRUGFT',
      ],
      'Unconscious or altered': [
        'UNC', 'ALTMEN', 'UNCFC', 'ALTMFC', 'T-UNC', 'T-ALTM', 'ALTMRF', 'UNCRF', 'UNCFT', 'ALTMFT',
      ],
      'Unknown or other': [
        'ACTIVE', 'DOA', 'DOAU', 'MCI21', 'MCI22', 'MCI23', 'MCI24', 'MCI25', 'MCI28', 'MCI29', 'MCI31',
        'MCI32', 'MCI33', 'MCI34', 'MCI35', 'MCI36', 'MCI38', 'MCI40', 'MCI42', 'MCI43', 'MCI44', 'MCI50',
        'MCI57', 'MCI59', 'MCI76', 'MCI77', 'MCI80', 'MEDVAC', 'OTHER', 'SPEVNT', 'STNDBM', 'STNDBY', 'STRANS',
        'T-ACTV', 'T-OTHR', 'T-TEXT', 'T-UNKN', 'UNKNOW',
      ],
    },
  },
  sample: { lo: 600, hi: 50000, seasonality: { amplitude: 0.12, peakMonth: 6 } },
} satisfies Metric
