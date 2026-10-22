// Builds the EMS station points transcribed from the right-hand column of
// public/data/unit_locations.pdf (FDNY Unit Location Chart, March 2011).
// Standard addresses are geocoded against NYC Planning's authoritative PAD-backed
// GeoSearch service. The two campus/pier locations use official NYC building centroids.
// Run: npm run data:ems-stations
import { writeFileSync } from 'node:fs'

const stations = [
  { station: 4, division: 1, neighbourhood: 'Lower East Side', address: 'Pier 36, South Street', borough: 'Manhattan' },
  { station: 8, division: 1, neighbourhood: 'Kips Bay', address: '462 1st Avenue', borough: 'Manhattan' },
  { station: 10, division: 1, neighbourhood: 'Yorkville', address: '1918 1st Avenue', borough: 'Manhattan' },
  { station: 16, division: 2, neighbourhood: 'Harlem', address: '506 Lenox Avenue', borough: 'Manhattan' },
  { station: 14, division: 2, neighbourhood: 'South Bronx', address: '234 East 149th Street', borough: 'Bronx' },
  { station: 15, division: 2, neighbourhood: 'Williamsbridge', address: '4109 White Plains Road', borough: 'Bronx' },
  { station: 17, division: 2, neighbourhood: 'High Bridge', address: '1080 Ogden Avenue', borough: 'Bronx' },
  { station: 18, division: 2, neighbourhood: 'Bathgate', address: '1647 Washington Avenue', borough: 'Bronx' },
  { station: 19, division: 2, neighbourhood: 'University Heights', address: '2285 Jerome Avenue', borough: 'Bronx' },
  { station: 20, division: 2, neighbourhood: 'Morris Park', address: '1410 Pelham Parkway', borough: 'Bronx' },
  { station: 26, division: 2, neighbourhood: 'Morrisania', address: '1264 Boston Road', borough: 'Bronx' },
  { station: 55, division: 2, neighbourhood: 'Melrose', address: '3134 Park Avenue', borough: 'Bronx' },
  { station: 27, division: 2, neighbourhood: '50th Precinct', address: '3450 Kingsbridge Avenue', borough: 'Bronx' },
  { station: 31, division: 3, neighbourhood: 'Cumberland', address: '39 Auburn Place', borough: 'Brooklyn' },
  { station: 32, division: 3, neighbourhood: 'Carroll Gardens', address: '347 Bond Street', borough: 'Brooklyn' },
  { station: 35, division: 3, neighbourhood: 'Williamsburg', address: '720 Flushing Avenue', borough: 'Brooklyn' },
  { station: 38, division: 3, neighbourhood: 'Wingate', address: '554 Winthrop Street', borough: 'Brooklyn' },
  { station: 39, division: 3, neighbourhood: 'Pennsylvania', address: '265 Pennsylvania Avenue', borough: 'Brooklyn' },
  { station: 44, division: 3, neighbourhood: 'Brownsville', address: '266 Rockaway Avenue', borough: 'Brooklyn' },
  { station: 57, division: 3, neighbourhood: 'Bedford-Stuyvesant', address: '131 Throop Avenue', borough: 'Brooklyn' },
  { station: 58, division: 3, neighbourhood: 'East 83rd Street', address: '420 East 83rd Street', borough: 'Brooklyn' },
  { station: 45, division: 4, neighbourhood: 'Woodside', address: '58-65 52nd Road', borough: 'Queens' },
  { station: 46, division: 4, neighbourhood: 'Elmhurst', address: '79-01 Broadway', borough: 'Queens' },
  { station: 47, division: 4, neighbourhood: 'Rockaway', address: '303 Beach 49th Street', borough: 'Queens' },
  { station: 49, division: 4, neighbourhood: 'Astoria', address: '25-10 30th Avenue', borough: 'Queens' },
  { station: 50, division: 4, neighbourhood: 'Hillcrest', address: '82-68 164th Street', borough: 'Queens' },
  { station: 52, division: 4, neighbourhood: 'Flushing', address: '135-16 38th Avenue', borough: 'Queens' },
  {
    station: 53,
    division: 4,
    neighbourhood: 'Fort Totten',
    address: 'Building 104, Fort Totten',
    borough: 'Queens',
    note: 'The March 2011 chart says Building 104; current NYC municipal records identify EMS Station 53 as Building 103, whose official centroid is used.',
  },
  { station: 54, division: 4, neighbourhood: 'Springfield Gardens', address: '222-15 Merrick Boulevard', borough: 'Queens' },
  { station: 22, division: 5, neighbourhood: 'Willowbrook', address: '460 Brielle Avenue', borough: 'Staten Island' },
  { station: 23, division: 5, neighbourhood: 'Rossville', address: '1100 Rossville Avenue', borough: 'Staten Island' },
  { station: 40, division: 5, neighbourhood: 'Sunset Park', address: '5011 7th Avenue', borough: 'Brooklyn' },
  { station: 43, division: 5, neighbourhood: 'Gravesend', address: '2601 Ocean Parkway', borough: 'Brooklyn' },
]

// EMS 4: NYC BIN 1078939. EMS 47 shares the Engine 265/Ladder 121 firehouse and
// uses its FDNY Firehouse Listing point because PAD labels the lot 329 Beach 49th
// Street. EMS 53: NYC BIN 4539866. The chart labels the latter "Bldg #104";
// current NYC municipal records identify EMS 53 as Building 103.
const officialBuildingPoints = new Map([
  [4, [-73.98627314069, 40.709638489289]],
  [47, [-73.779164, 40.593539]],
  [53, [-73.780776530795, 40.791242554765]],
])

async function geocode({ station, address, borough }) {
  const official = officialBuildingPoints.get(station)
  if (official) return official

  const url = new URL('https://geosearch.planninglabs.nyc/v2/search')
  url.searchParams.set('text', `${address}, ${borough}`)
  url.searchParams.set('size', '5')
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`GeoSearch answered ${response.status} for EMS Station ${station}`)
  const body = await response.json()
  const boroughMatch = body.features?.find((feature) => feature.properties?.borough === borough)
  const feature = boroughMatch ?? body.features?.[0]
  const coordinates = feature?.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
    throw new Error(`No point found for EMS Station ${station}: ${address}, ${borough}`)
  }
  console.log(`EMS ${String(station).padStart(2)}: ${feature.properties.label}`)
  return coordinates
}

if (stations.length !== 33 || new Set(stations.map(({ station }) => station)).size !== stations.length) {
  throw new Error('Expected 33 unique EMS stations from the PDF')
}

const features = []
for (const station of stations) {
  const coordinates = (await geocode(station)).map((value) => Number(value.toFixed(6)))
  features.push({
    type: 'Feature',
    properties: { id: station.station, ...station, note: station.note ?? null },
    geometry: { type: 'Point', coordinates },
  })
}

const collection = {
  type: 'FeatureCollection',
  features,
  source: 'FDNY Unit Location Chart, March 2011',
  geocoder: 'NYC Planning GeoSearch, NYC Open Data building centroids, and the FDNY Firehouse Listing',
}
writeFileSync('src/data/ems-stations.json', `${JSON.stringify(collection)}\n`)
console.log(`Wrote ${features.length} EMS stations to src/data/ems-stations.json`)
