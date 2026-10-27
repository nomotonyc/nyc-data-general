// Fetch every NYC facility row, preserving all source fields and duplicate IDs.
// Run: node scripts/build-open-ny-facilities.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const endpoint = 'https://health.data.ny.gov/resource/vn5v-hh5r.json'
export const counties = {
  7093: { county: 'New York', borough: 'Manhattan', borough_sort_code: '031' },
  7094: { county: 'Bronx', borough: 'Bronx', borough_sort_code: '032' },
  7095: { county: 'Kings', borough: 'Brooklyn', borough_sort_code: '033' },
  7096: { county: 'Queens', borough: 'Queens', borough_sort_code: '034' },
  7097: { county: 'Richmond', borough: 'Staten Island', borough_sort_code: '035' },
}
const where = 'cnty_cd in (7093,7094,7095,7096,7097)'
const output = new URL('../public/data/reference_data/open_ny/', import.meta.url)
const read = (url) => JSON.parse(readFileSync(url, 'utf8'))
const write = (name, value) => writeFileSync(new URL(name, output), `${JSON.stringify(value, null, 2)}\n`)
const groupKey = (r) => JSON.stringify([String(r.cnty_cd), r.county, r.description])

export function prepareRows(rows, sourceCounts) {
  const actual = new Map()
  const prepared = rows.map((row) => {
    const mapping = counties[row.cnty_cd]
    if (!mapping || mapping.county !== row.county) throw new Error(`Unexpected county/code: ${row.cnty_cd}/${row.county}`)
    if (!row.fac_id) throw new Error('Missing facility ID')
    actual.set(groupKey(row), (actual.get(groupKey(row)) ?? 0) + 1)
    return { ...row, borough: mapping.borough, borough_sort_code: mapping.borough_sort_code }
  })
  if (actual.size !== sourceCounts.length || sourceCounts.some((r) => actual.get(groupKey(r)) !== Number(r.count))) {
    throw new Error('Downloaded rows do not match independently queried county/type counts; retry the download')
  }
  return prepared.sort((a, b) => a.borough_sort_code.localeCompare(b.borough_sort_code)
    || Number(a.fac_id) - Number(b.fac_id) || JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

// Reviewed against names and locations in the existing general-hospital layer.
// These are local reconciliation candidates, not official equivalence mappings.
const legacyIds = {
  1437: [37], 1438: [1], 1445: [12], 1446: [43], 1447: [14], 1450: [20],
  1453: [26], 1454: [27], 1456: [31], 1458: [36], 1460: [39], 1463: [44],
  1464: [36], 1466: [34], 1469: [32], 1486: [13],
  1165: [16], 1168: [28], 1169: [29], 1172: [21], 1175: [5], 1178: [2], 1186: [40],
  1286: [3], 1288: [4], 1293: [24], 1294: [7], 1301: [18], 1304: [45],
  1305: [23], 1306: [38], 1309: [15], 1315: [19], 1318: [55], 1320: [52, 53], 1692: [54],
  1626: [8], 1628: [9], 1629: [17], 1633: [47], 1635: [50], 1637: [35], 1638: [22], 1639: [33],
  1737: [51], 1738: [48], 1740: [51],
}
const missingIds = new Set(['3975', '9700', '10139', '10355', '15437', '1164', '1176', '1185', '3058', '15897', '1324', '9753', '10223', '1630', '1473'])
const missingCampusIds = new Set(['1464', '1737'])

export function compareHospitals(rows, legacy, psychiatric) {
  const hospitals = new Map()
  for (const row of rows.filter((r) => r.fac_desc_short === 'HOSP')) {
    if (!hospitals.has(row.fac_id)) hospitals.set(row.fac_id, [])
    hospitals.get(row.fac_id).push(row)
  }
  const usedLegacyIds = new Set()
  const records = [...hospitals].map(([fac_id, sourceRows]) => {
    const r = sourceRows[0]
    const candidates = (legacyIds[fac_id] ?? []).map((id) => {
      const feature = legacy.features.find((f) => f.properties.id === id)
      if (!feature) throw new Error(`Missing legacy ID ${id}; review the crosswalk`)
      usedLegacyIds.add(id)
      let distance = null
      if (feature.geometry && r.longitude && r.latitude) {
        const [lon, lat] = feature.geometry.coordinates
        distance = Math.round(Math.hypot((Number(r.longitude) - lon) * Math.cos(Number(r.latitude) * Math.PI / 180), Number(r.latitude) - lat) * 111195)
      }
      return { id, name: feature.properties.name, coordinates: feature.geometry?.coordinates ?? null, approximate_distance_m: distance }
    })
    return {
      fac_id, facility_name: r.facility_name, cnty_cd: r.cnty_cd,
      borough: r.borough, borough_sort_code: r.borough_sort_code, address1: r.address1,
      coordinates: r.longitude && r.latitude ? [Number(r.longitude), Number(r.latitude)] : null,
      source_row_count: sourceRows.length,
      status: missingCampusIds.has(fac_id) ? 'combined_in_legacy_missing_separate_point'
        : candidates.length ? 'candidate_legacy_match'
          : missingIds.has(fac_id) ? 'missing_from_legacy' : 'needs_review',
      legacy_candidates: candidates,
      location_review_needed: candidates.some((c) => c.approximate_distance_m > 500) || !r.longitude || !r.latitude,
    }
  })
  return {
    source: endpoint, hospital_filter: "fac_desc_short = 'HOSP'",
    methodology: [
      'Facility ID defines a distinct Open NY site. All cooperator rows remain in facilities_nyc.json.',
      'Candidate matches were reviewed using source names, legacy names and locations; they are not official crosswalks.',
      'Combined Columbia/Weill Cornell and Staten Island North/South entries require separate map points for Columbia and Princes Bay.',
      'Distances are approximate. Candidate coordinates over 500 m apart or absent source coordinates require location review.',
      'An unmatched legacy entry is not proof of closure or invalidity. This dataset alone cannot establish coverage of all psychiatric, federal, research or historical hospitals.',
      'The source classifies some ambulatory sites as HOSP; this comparison follows its classification and makes no emergency-service claim.',
    ],
    summary: {
      source_hospital_rows: records.reduce((n, r) => n + r.source_row_count, 0),
      distinct_source_hospitals: records.length,
      legacy_general_entries: legacy.features.length,
      legacy_psychiatric_entries: psychiatric.features.length,
      statuses: Object.fromEntries([...new Set(records.map((r) => r.status))].map((status) => [status, records.filter((r) => r.status === status).length])),
    },
    hospitals: records,
    legacy_without_hospital_match: legacy.features.filter((f) => !usedLegacyIds.has(f.properties.id)).map((f) => f.properties),
    psychiatric_entries_not_reconciled: psychiatric.features.map((f) => f.properties),
  }
}

export function hospitalPoints(rows) {
  const seen = new Set()
  return { type: 'FeatureCollection', features: rows.flatMap((r) => {
    if (r.fac_desc_short !== 'HOSP' || seen.has(r.fac_id)) return []
    seen.add(r.fac_id)
    const longitude = Number(r.longitude), latitude = Number(r.latitude)
    if (!r.longitude || !r.latitude || !Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
    return [{ type: 'Feature', geometry: { type: 'Point', coordinates: [longitude, latitude] }, properties: {
      id: r.fac_id, name: r.facility_name, address: r.address1 ?? '', borough: r.borough,
      fac_desc_short: r.fac_desc_short,
    } }]
  }) }
}

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return response.json()
}
function query(parameters) {
  const url = new URL(endpoint)
  url.search = new URLSearchParams(parameters).toString()
  return request(url)
}

async function main() {
  let rawRows, sourceCounts, sourceMetadata
  const fixtureIndex = process.argv.indexOf('--from-dir')
  if (fixtureIndex !== -1) {
    // Reproduce a download made with curl when Node has no network access.
    const dir = process.argv[fixtureIndex + 1]
    rawRows = read(`${dir}/open-ny-facilities-nyc.json`)
    sourceCounts = read(`${dir}/open-ny-facilities-counts.json`)
    sourceMetadata = read(`${dir}/open-ny-facilities-metadata.json`)
  } else {
    sourceMetadata = await request('https://health.data.ny.gov/api/views/vn5v-hh5r.json')
    sourceCounts = await query({ $where: where, $select: 'cnty_cd,county,description,count(*) AS count', $group: 'cnty_cd,county,description', $order: 'cnty_cd,description', $limit: '50000' })
    rawRows = []
    for (let offset = 0; ; offset += 5000) {
      // :id gives stable ordering even when facility IDs repeat for cooperators.
      const page = await query({ $where: where, $order: 'cnty_cd,fac_id,:id', $limit: '5000', $offset: String(offset) })
      rawRows.push(...page)
      if (page.length < 5000) break
    }
  }
  const rows = prepareRows(rawRows, sourceCounts)
  const comparison = compareHospitals(rows,
    read(new URL('../public/data/reference_data/layers/hospitals_nyc.json', import.meta.url)),
    read(new URL('../public/data/reference_data/layers/psych_hospitals_nyc.json', import.meta.url)))
  mkdirSync(output, { recursive: true })
  write('facilities_nyc.json', rows)
  write('hospitals_nyc.geojson', hospitalPoints(rows))
  write('hospital_comparison.json', comparison)
  write('metadata.json', {
    dataset: sourceMetadata.name, dataset_id: 'vn5v-hh5r',
    source_url: 'https://health.data.ny.gov/Health/Health-Facility-General-Information/vn5v-hh5r',
    api_url: endpoint, retrieved_at: new Date().toISOString(),
    source_rows_updated_at: new Date(sourceMetadata.rowsUpdatedAt * 1000).toISOString(),
    filter: where, county_mapping: counties,
    row_count: rows.length, distinct_facility_ids: new Set(rows.map((r) => r.fac_id)).size,
    source_counts_by_county_and_type: sourceCounts,
    source_columns: sourceMetadata.columns.filter((c) => !c.fieldName.startsWith(':')).map((c) => ({ field: c.fieldName, name: c.name, type: c.dataTypeName, description: c.description ?? '' })),
    notes: [
      'All source rows and fields are retained, including duplicates, absent fields and original string encodings of numbers.',
      'cnty_cd is the original Facility County Code. Codes 7093–7097 identify NYC in this dataset; 31–35 identify Niagara, Oneida, Onondaga, Ontario and Orange.',
      'borough and borough_sort_code are local additions. Codes 031–035 are sorting labels only, not source county codes.',
      'No facility type filter is applied. Source metadata describes narrower coverage than the live rows; the export includes every returned facility type.',
      'Counts are validated independently by county and facility description before any output is written.',
    ],
  })
  console.log(JSON.stringify({ rows: rows.length, ...comparison.summary }, null, 2))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1 })
}
