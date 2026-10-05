import { describe, expect, it } from 'vitest'
import { geoclientRequest, geoclientPoint } from './geoclient'

describe('geoclientRequest', () => {
  it('asks Geoclient v2 for an intersection, with the key in a header, never the URL', () => {
    const { url, headers } = geoclientRequest('BRONX', ['HUNTS POINT AVE', 'BRUCKNER BLVD'], 'secret')
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://api.nyc.gov/geoclient/v2/intersection.json')
    expect(Object.fromEntries(u.searchParams)).toEqual({ crossStreetOne: 'HUNTS POINT AVE', crossStreetTwo: 'BRUCKNER BLVD', borough: 'Bronx' })
    expect(url).not.toContain('secret')
    expect(headers).toEqual({ 'Ocp-Apim-Subscription-Key': 'secret' })
  })

  it('names Staten Island as Geoclient expects', () => {
    expect(new URL(geoclientRequest('RICHMOND / STATEN ISLAND', ['A', 'B'], 'k').url).searchParams.get('borough')).toBe('Staten Island')
  })
})

describe('geoclientPoint', () => {
  it('reads the point from a found intersection', () => {
    expect(geoclientPoint({ intersection: { geosupportReturnCode: '00', latitude: 40.81, longitude: -73.89 } })).toEqual({ lat: 40.81, lon: -73.89 })
  })

  it('returns null when Geosupport could not find it', () => {
    expect(geoclientPoint({ intersection: { geosupportReturnCode: 'EE', message: 'NOT FOUND' } })).toBeNull()
    expect(geoclientPoint({})).toBeNull()
  })
})
