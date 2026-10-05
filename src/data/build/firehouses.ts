import { BOROUGHS } from '../../domain/geography'
import { commandRank, parseUnits, type Firehouse } from '../../domain/firehouses'
import { areaNumberAt, type AreaShapes } from './openDataPoints'

/** One record of the FDNY Firehouse Listing (NYC Open Data hc8x-tcnd), as the API returns it. */
export type FirehouseRow = {
  facilityname: string
  facilityaddress?: string
  borough: string
  nta?: string
  latitude?: string
  longitude?: string
}


export type FirehouseCollection = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: Firehouse; geometry: { type: 'Point'; coordinates: [number, number] } }[]
}

/** The map's firehouse points, numbered by borough then name so ids don't depend on the API's order. */
export function firehouseFeatures(rows: readonly FirehouseRow[], battalions: AreaShapes): FirehouseCollection {
  const sorted = [...rows].sort((a, b) => a.borough.localeCompare(b.borough) || a.facilityname.localeCompare(b.facilityname))
  return {
    type: 'FeatureCollection',
    features: sorted.map((r, i) => {
      const units = parseUnits(r.facilityname)
      if (!(BOROUGHS as readonly string[]).includes(r.borough)) throw new Error(`${r.facilityname}: unknown borough "${r.borough}"`)
      const lon = Number(r.longitude)
      const lat = Number(r.latitude)
      if (!r.longitude || !r.latitude || !Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error(`${r.facilityname}: no location`)
      return {
        type: 'Feature',
        properties: {
          id: i + 1,
          name: r.facilityname,
          address: r.facilityaddress ?? '',
          neighbourhood: r.nta ?? '',
          borough: r.borough,
          battalion: areaNumberAt(battalions, lon, lat, 'battalions'),
          command: commandRank(units),
        },
        geometry: { type: 'Point', coordinates: [lon, lat] },
      }
    }),
  }
}
