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

/**
 * Where the listing (last updated April 2022) is known to be out of date, keyed by its name.
 * Each is checked against FDNY's station list in NERIS (neris.fsri.org) and noted on the card;
 * the marker stays where the listing has it. See data-sources.md, Firehouses.
 */
export const FIREHOUSE_NOTES: Readonly<Record<string, string>> = {
  // Checked October 2026: NYC Public Design Commission, 8 Aug 2022; Juniper Park Civic Association;
  // NERIS lists 90-26 57th Ave. Re-check when the rebuild is due to finish (end of 2026).
  'Battalion 46/Engine 287/Ladder 136':
    'As of October 2026, temporarily at 90-26 57th Avenue (since December 2023) while this firehouse is demolished and rebuilt, planned to the end of 2026',
}

/** The map's firehouse points, numbered by borough then name so ids don't depend on the API's order. */
export function firehouseFeatures(
  rows: readonly FirehouseRow[],
  battalions: AreaShapes,
  notes: Readonly<Record<string, string>> = FIREHOUSE_NOTES,
): FirehouseCollection {
  // A note for a firehouse the listing no longer has would silently vanish; stop instead.
  const gone = Object.keys(notes).filter((name) => !rows.some((r) => r.facilityname === name))
  if (gone.length) throw new Error(`Notes for firehouses not in the listing: ${gone.join('; ')}`)
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
          note: notes[r.facilityname] ?? null,
        },
        geometry: { type: 'Point', coordinates: [lon, lat] },
      }
    }),
  }
}
