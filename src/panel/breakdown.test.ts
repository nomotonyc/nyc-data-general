import { describe, expect, it } from 'vitest'
import { getDataset } from '../data/load'
import { areaIdsIn } from '../data/places'
import { breakdownShares } from '../data/selectors'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { getLayer } from '../layers'
import { lightTheme } from '../theme/tokens'
import { breakdown } from './breakdown'

const ems: ExplorerState = { ...initialExplorerState, storyId: 'medical', metricId: 'ems-calls' }
const ds = getDataset('ems-calls')
const palette = { ramp: lightTheme.story.medical.ramp, greys: [lightTheme.color.inkFaint, lightTheme.color.lineStrong] }

describe('breakdown', () => {
  it('names the layer’s parts with their share of the city', () => {
    const b = breakdown(ems, ds, palette)
    expect(b.title).toBe('Call type')
    expect(b.parts.map((p) => p.label)).toEqual([...getLayer('ems-calls').breakdown.parts])
    const shares = breakdownShares(ds, areaIdsIn(ds, null), { from: 2025, to: 2025 })
    expect(b.parts.map((p) => p.width)).toEqual(shares.map((s) => s * 100))
    expect(b.parts[0].share).toBe(`${Math.round(shares[0] * 100)}%`)
  })

  it('follows the focused borough, or the pinned precinct', () => {
    const queens = breakdown({ ...ems, borough: 'Queens' }, ds, palette)
    expect(queens.parts.map((p) => p.width)).toEqual(breakdownShares(ds, areaIdsIn(ds, 'Queens'), { from: 2025, to: 2025 }).map((s) => s * 100))
    const pinned = breakdown({ ...ems, borough: 'Queens', pinnedPrecinct: 116 }, ds, palette)
    expect(pinned.parts.map((p) => p.width)).toEqual(breakdownShares(ds, ['105+116'], { from: 2025, to: 2025 }).map((s) => s * 100))
  })

  it('gives every part its own colour, darkest first, greys after the ramp', () => {
    const colours = breakdown(ems, ds, palette).parts.map((p) => p.colour)
    expect(new Set(colours).size).toBe(colours.length)
    expect(colours.slice(0, 5)).toEqual([...palette.ramp].reverse())
    expect(colours.slice(5)).toEqual(palette.greys)
  })
})
