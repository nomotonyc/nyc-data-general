import type { UnitKind } from '../domain/firehouses'
import type { StoryPalette, Theme } from '../theme/tokens'

/**
 * A company's chip on the firehouse card, in the current story's colours. Engines and ladders,
 * which most firehouses have both of, get the most different fills. The ramp's fourth step is
 * left out: neither dark nor white text reads on it.
 */
export function unitChip(kind: UnitKind, palette: StoryPalette, color: Theme['color']): { background: string; ink: string } | null {
  const { ramp, accent } = palette
  switch (kind) {
    case 'Engine':
      return { background: ramp[2], ink: color.ink }
    case 'Ladder':
      return { background: ramp[4], ink: color.tooltipInk }
    case 'Squad':
      return { background: ramp[1], ink: color.ink }
    case 'Rescue':
      return { background: accent, ink: color.tooltipInk }
    case 'Marine':
      return { background: ramp[0], ink: color.ink }
    default:
      return null
  }
}
