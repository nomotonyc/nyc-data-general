import { describe, expect, it } from 'vitest'
import { initialExplorerState } from '../explorer/state'
import { LAYERS, boroughLayers } from './config'
import { clickAction, hitKind } from './interaction'

const borough = (name: string) => ({ kind: 'borough' as const, properties: { borough: name } })
const precinct = (n: number, b: string) => ({ kind: 'precinct' as const, properties: { precinct: n, borough: b } })
const city = initialExplorerState

describe('clickAction', () => {
  it('focuses the borough clicked at borough level', () => {
    expect(clickAction(city, [precinct(114, 'Queens'), borough('Queens')])).toEqual({ type: 'focusBorough', borough: 'Queens' })
  })

  it('pins the precinct clicked at precinct level', () => {
    expect(clickAction({ ...city, detail: 'precinct' }, [precinct(44, 'Bronx'), borough('Bronx')])).toEqual({
      type: 'pinPrecinct',
      precinct: 44,
    })
  })

  it('pins a precinct inside the focused borough', () => {
    expect(clickAction({ ...city, borough: 'Queens' }, [precinct(116, 'Queens'), borough('Queens')])).toEqual({
      type: 'pinPrecinct',
      precinct: 116,
    })
  })

  it('ignores clicks on the hidden boroughs around a focused one', () => {
    expect(clickAction({ ...city, borough: 'Queens' }, [precinct(75, 'Brooklyn'), borough('Brooklyn')])).toBeNull()
  })

  it('ignores clicks on the water when nothing is pinned', () => {
    expect(clickAction(city, [])).toBeNull()
  })

  it('unpins when the water is clicked, staying in the current view', () => {
    expect(clickAction({ ...city, borough: 'Brooklyn', pinnedPrecinct: 75 }, [])).toEqual({ type: 'unpinPrecinct' })
    expect(clickAction({ ...city, detail: 'precinct', pinnedPrecinct: 14 }, [])).toEqual({ type: 'unpinPrecinct' })
  })

  it('unpins when the faded area around a focused borough is clicked', () => {
    expect(clickAction({ ...city, borough: 'Queens', pinnedPrecinct: 114 }, [precinct(75, 'Brooklyn')])).toEqual({
      type: 'unpinPrecinct',
    })
  })

  it('ignores features that are not a known borough or precinct', () => {
    expect(clickAction(city, [borough('Atlantis')])).toBeNull()
    expect(clickAction({ ...city, detail: 'precinct' }, [precinct(2, 'Manhattan')])).toBeNull()
  })
})

describe('hitKind', () => {
  it('tells borough layers from precinct layers', () => {
    expect(hitKind(boroughLayers('Queens').boroughFill)).toBe('borough')
    expect(hitKind(boroughLayers('Queens').precinctFill)).toBe('precinct')
    expect(hitKind(LAYERS.boroughLabel)).toBeNull()
  })
})
