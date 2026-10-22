import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build, coordinates } from './build-hospitals.mjs'

const read = (file) => readFileSync(new URL(`../public/data/layers/${file}`, import.meta.url), 'utf8')

test('converts DMS with fractional or absent seconds to longitude, latitude', () => {
  assert.deepEqual(coordinates('40°49′N 73°55′W'), [-73.916667, 40.816667])
  assert.deepEqual(coordinates('40°50′52.9″N 73°50′38.8″W'), [-73.844111, 40.848028])
  assert.equal(coordinates(''), null)
  assert.throws(() => coordinates('unknown'))
})

for (const [source, psychiatric, counts] of [
  ['hospitals_nyc.txt', false, { Bronx: 7, Kings: 14, 'New York': 24, Queens: 8, Richmond: 2 }],
  ['psych_hospitals_nyc', true, { Bronx: 1, Kings: 2, 'New York': 4, Queens: 3, Richmond: 2 }],
]) {
  test(`${source}: NYC filter, source coverage and committed output`, () => {
    const result = build(read(source), psychiatric, source)
    assert.deepEqual(result, JSON.parse(read(`${result.layerId}.json`)))
    const actual = {}
    for (const { properties: p, geometry } of result.features) {
      assert.ok(Object.hasOwn(counts, p.county))
      actual[p.county] = (actual[p.county] ?? 0) + 1
      if (geometry) {
        const [lon, lat] = geometry.coordinates
        assert.ok(lon > -74.3 && lon < -73.6 && lat > 40.4 && lat < 41)
      }
    }
    assert.deepEqual(actual, counts)
    const find = (name) => result.features.find((f) => f.properties.name === name)
    if (psychiatric) {
      assert.equal(find("Queens Children's Psychiatric Center").geometry, null)
      assert.equal(find('Bloomingdale Insane Asylum').properties.opened, '1821-1889')
      assert.equal(find('Zucker Hillside Hospital (Northwell Health)').properties.beds, '0')
    } else {
      assert.equal(find('Brooklyn Hospital Center').properties.county, 'Kings')
      assert.equal(find('NYU Langone Kimmel Pavilion').properties.healthSystem, 'NYU Langone Health')
      assert.equal(find('Mount Sinai West').properties.county, 'New York')
      assert.equal(find('Mount Sinai South Nassau'), undefined)
      assert.equal(find('Long Island Jewish Medical Center'), undefined)
      assert.ok(result.features.some((f) => f.properties.name.startsWith('NewYork-Presbyterian Hospital /')))
    }
  })
}
