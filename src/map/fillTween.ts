import { BOROUGHS, areasOf } from '../domain/geography'
import type { Choropleth } from './choropleth'
import { GEOGRAPHY_MAP, SOURCES } from './config'

/** One feature's fill: which source, which feature, and its colour (null for none). */
export type Fill = { source: string; id: string | number; fill: string | null }

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** `a` moved a fraction `t` of the way to `b`, both "#rrggbb". */
export function mixHex(a: string, b: string, t: number): string {
  const from = channels(a)
  const to = channels(b)
  return `#${from.map((c, i) => Math.round(c + (to[i] - c) * t).toString(16).padStart(2, '0')).join('')}`
}

/** Every borough's fill and every area's fill in the plan's geography, keyed "source|id". */
export function planFills(plan: Choropleth): Map<string, Fill> {
  const fills = new Map<string, Fill>()
  for (const b of BOROUGHS) fills.set(`${SOURCES.boroughs}|${b}`, { source: SOURCES.boroughs, id: b, fill: plan.boroughs[b] ?? null })
  const source = GEOGRAPHY_MAP[plan.geography].source
  for (const a of areasOf(plan.geography)) fills.set(`${source}|${a.number}`, { source, id: a.number, fill: plan.areas[a.number] ?? null })
  return fills
}

/**
 * The fills a fraction `t` (0–1) of the way from the colours shown to the new ones. MapLibre
 * can't animate per-feature colours, so a colour change is drawn frame by frame. Features
 * with no colour to come from, or none to go to, take their new fill straight away.
 */
export function fillsAt(from: ReadonlyMap<string, string | null>, to: ReadonlyMap<string, Fill>, t: number): Fill[] {
  return [...to].map(([key, f]) => {
    const was = from.get(key)
    return was && f.fill && t < 1 ? { ...f, fill: mixHex(was, f.fill, t) } : f
  })
}
