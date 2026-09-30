import { getLayer } from '../layers'
import { describe, expect, it } from 'vitest'
import { formatCount } from '../domain/format'
import { lightTheme } from '../theme/tokens'
import type { Choropleth } from './choropleth'
import { legendDetails } from './legend'

const fires = getLayer('structural-fires')
const density = getLayer('population-density')
const ramp = lightTheme.story.fire.ramp
const plan: Choropleth = {
  level: 'borough',
  focus: null,
  boroughs: {},
  precincts: {},
  lo: 2175.4,
  hi: 9766,
  range: { from: 2025, to: 2025 },
  adjusted: false,
}

describe('legendDetails', () => {
  it('names the layer, years and level', () => {
    expect(legendDetails(plan, fires, ramp, { from: 2025, to: 2025 }, { from: 2019, to: 2026 }).title).toBe('Structural fires, 2025 · by borough')
    expect(legendDetails({ ...plan, level: 'precinct' }, fires, ramp, { from: 2025, to: 2025 }, { from: 2019, to: 2026 }).title).toBe(
      'Structural fires, 2025 · by precinct',
    )
  })

  it('writes a range of years, labelling the partial final year', () => {
    const details = legendDetails({ ...plan, range: { from: 2024, to: 2026 } }, fires, ramp, { from: 2024, to: 2026 }, { from: 2019, to: 2026 })
    expect(details.title).toBe('Structural fires, 2024–2026 (Jan–Jun) · by borough')
  })

  it('shows the five colour steps with the lowest and highest values', () => {
    const details = legendDetails(plan, fires, ramp, { from: 2025, to: 2025 }, { from: 2019, to: 2026 })
    expect(details.steps).toEqual([...ramp])
    expect(details.lo).toBe(formatCount(2175.4))
    expect(details.hi).toBe(formatCount(9766))
  })

  it('has no note when the data covers the years chosen', () => {
    expect(legendDetails(plan, fires, ramp, { from: 2025, to: 2025 }, { from: 2019, to: 2026 }).note).toBeNull()
  })

  it('says when later years fall back to the latest available', () => {
    const adjusted = { ...plan, range: { from: 2024, to: 2024 }, adjusted: true } as const
    const details = legendDetails(adjusted, density, ramp, { from: 2025, to: 2026 }, { from: 2021, to: 2024 })
    expect(details.title).toBe('Population density, 2024 · by borough')
    expect(details.note).toBe('No 2025–2026 (Jan–Jun) estimates yet · showing 2024')
  })

  it('says when earlier years fall back to the earliest available', () => {
    const adjusted = { ...plan, range: { from: 2021, to: 2021 }, adjusted: true } as const
    expect(legendDetails(adjusted, density, ramp, { from: 2019, to: 2020 }, { from: 2021, to: 2024 }).note).toBe('No 2019–2020 estimates · showing 2021')
  })

  it('says when a range is trimmed to the years with data', () => {
    const adjusted = { ...plan, range: { from: 2021, to: 2022 }, adjusted: true } as const
    expect(legendDetails(adjusted, density, ramp, { from: 2019, to: 2022 }, { from: 2021, to: 2024 }).note).toBe(
      'Estimates cover 2021–2024 · showing 2021–2022',
    )
  })

  it('writes the lowest and highest values in the layer’s format', () => {
    const share = { ...fires, format: 'percent' as const, unit: 'of fires' }
    const details = legendDetails({ ...plan, lo: 6.24, hi: 33.9 }, share, ramp, { from: 2025, to: 2025 }, { from: 2019, to: 2026 })
    expect([details.lo, details.hi]).toEqual(['6.2%', '33.9%'])
  })
})
