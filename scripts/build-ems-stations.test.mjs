import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildEmsStations, facilityType } from './build-ems-stations.mjs'

const output = JSON.parse(readFileSync(new URL('../public/data/reference_data/ems_stations.geojson', import.meta.url), 'utf8'))

test('EMS layer contains only unique source ambulance stations with valid NYC points', () => {
  assert.equal(output.layerId, 'ems_stations')
  assert.equal(output.facilityType, facilityType)
  assert.equal(output.features.length, 34)
  assert.equal(new Set(output.features.map((f) => f.properties.uid)).size, 34)
  for (const feature of output.features) {
    assert.equal(feature.properties.factype, facilityType)
    assert.ok(feature.properties.facname)
    const [longitude, latitude] = feature.geometry.coordinates
    assert.ok(longitude > -74.3 && longitude < -73.6)
    assert.ok(latitude > 40.4 && latitude < 41)
  }
})

test('builder rejects another facility type, duplicate IDs, missing points and unknown boroughs', () => {
  const row = {
    uid: 'one', facname: 'EMS Station 1', factype: facilityType,
    address: '1 Main Street', boro: 'QUEENS', latitude: '40.7', longitude: '-73.8',
  }
  assert.equal(buildEmsStations([row], '2026-10-25T00:00:00.000Z').features[0].properties.borough, 'Queens')
  assert.throws(() => buildEmsStations([{ ...row, factype: 'HOSPITAL' }]), /Unexpected facility type/)
  assert.throws(() => buildEmsStations([row, row]), /duplicate UID/)
  assert.throws(() => buildEmsStations([{ ...row, latitude: '' }]), /Missing coordinates/)
  assert.throws(() => buildEmsStations([{ ...row, boro: 'NASSAU' }]), /Unexpected borough/)
})
