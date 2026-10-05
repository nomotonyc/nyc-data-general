/** NYC Geoclient v2 (api-portal.nyc.gov): geocodes alarm box street corners for the battalion build. */

const GEOCLIENT = 'https://api.nyc.gov/geoclient/v2/intersection.json'
const BOROUGH_NAME: Record<string, string> = {
  MANHATTAN: 'Manhattan',
  BRONX: 'Bronx',
  BROOKLYN: 'Brooklyn',
  QUEENS: 'Queens',
  'RICHMOND / STATEN ISLAND': 'Staten Island',
}

/** The request for one intersection. The key goes in a header, so it never appears in URLs or logs. */
export function geoclientRequest(borough: string, streets: [string, string], key: string): { url: string; headers: Record<string, string> } {
  const url = new URL(GEOCLIENT)
  url.searchParams.set('crossStreetOne', streets[0])
  url.searchParams.set('crossStreetTwo', streets[1])
  url.searchParams.set('borough', BOROUGH_NAME[borough.trim().toUpperCase()] ?? borough)
  return { url: url.toString(), headers: { 'Ocp-Apim-Subscription-Key': key } }
}

type GeoclientResponse = { intersection?: { geosupportReturnCode?: string; message?: string; latitude?: number | string; longitude?: number | string } }

/** The intersection's point, or null when Geosupport didn't find it (return codes 00 and 01 are matches). */
export function geoclientPoint(response: GeoclientResponse): { lat: number; lon: number } | null {
  const i = response.intersection
  if (!i || !['00', '01'].includes(i.geosupportReturnCode ?? '')) return null
  const lat = Number(i.latitude)
  const lon = Number(i.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 ? { lat, lon } : null
}
