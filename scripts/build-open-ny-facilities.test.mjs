import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { prepareRows, compareHospitals, hospitalPoints } from './build-open-ny-facilities.mjs'

const read = (path) => JSON.parse(readFileSync(new URL(`../public/data/reference_data/${path}`, import.meta.url), 'utf8'))
const rows = read('open_ny/facilities_nyc.json')
const metadata = read('open_ny/metadata.json')
const legacy = read('layers/hospitals_nyc.json')
const psychiatric = read('layers/psych_hospitals_nyc.json')

test('snapshot contains every independently counted source row, including duplicate IDs', () => {
  assert.deepEqual(prepareRows(rows, metadata.source_counts_by_county_and_type), rows)
  assert.equal(rows.length, metadata.row_count)
  assert.equal(new Set(rows.map((r) => r.fac_id)).size, metadata.distinct_facility_ids)
  const lenox = rows.filter((r) => r.fac_id === '1450')
  assert.equal(lenox.length, 2)
  assert.equal(new Set(lenox.map((r) => r.cooperator_name)).size, 2)
  assert.ok(rows.some((r) => r.description === 'Licensed Home Care Services Agency'))
  assert.ok(rows.some((r) => !r.fac_desc_short))
})

test('NYC source codes remain separate from the requested sorting labels', () => {
  const row = { fac_id: '1', cnty_cd: '7093', county: 'New York', description: 'Hospital', custom_field: 'preserved' }
  const result = prepareRows([row], [{ ...row, count: '1' }])[0]
  assert.equal(result.cnty_cd, '7093')
  assert.equal(result.borough_sort_code, '031')
  assert.equal(result.custom_field, 'preserved')
  assert.throws(() => prepareRows([{ ...row, cnty_cd: '31', county: 'Niagara' }], []), /Unexpected county/)
  assert.throws(() => prepareRows([{ ...row, county: 'Bronx' }], []), /Unexpected county/)
})

test('truncation or an unexpected group fails validation', () => {
  assert.throws(() => prepareRows(rows.slice(1), metadata.source_counts_by_county_and_type), /do not match/)
  assert.throws(() => prepareRows(rows, metadata.source_counts_by_county_and_type.slice(1)), /do not match/)
})

test('hospital reconciliation distinguishes sites, missing campuses and unknown future IDs', () => {
  const report = compareHospitals(rows, legacy, psychiatric)
  assert.deepEqual(report, read('open_ny/hospital_comparison.json'))
  assert.equal(report.hospitals.length, new Set(rows.filter((r) => r.fac_desc_short === 'HOSP').map((r) => r.fac_id)).size)
  const byId = (id) => report.hospitals.find((r) => r.fac_id === id)
  assert.equal(byId('1630').status, 'missing_from_legacy')
  assert.equal(byId('1737').status, 'combined_in_legacy_missing_separate_point')
  assert.equal(byId('1169').coordinates, null)
  assert.equal(byId('1450').source_row_count, 2)
  const future = compareHospitals([{ ...rows.find((r) => r.fac_desc_short === 'HOSP'), fac_id: '99999999' }], legacy, psychiatric)
  assert.equal(future.hospitals[0].status, 'needs_review')
})

test('map points include only distinct HOSP sites with source longitude and latitude', () => {
  const points = hospitalPoints(rows)
  assert.deepEqual(points, read('open_ny/hospitals_nyc.geojson'))
  assert.equal(points.features.length, 61)
  assert.equal(new Set(points.features.map((f) => f.properties.id)).size, 61)
  assert.ok(points.features.every((f) => f.properties.fac_desc_short === 'HOSP'))
  assert.ok(!points.features.some((f) => f.properties.id === '1169'))
})
