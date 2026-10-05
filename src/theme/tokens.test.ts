import { describe, expect, it } from 'vitest'
import { contrastRatio, luminance } from '../test/contrast'
import { cssVarName, lightTheme } from './tokens'

describe('cssVarName', () => {
  it('prefixes single-word tokens with --color-', () => {
    expect(cssVarName('background')).toBe('--color-background')
  })

  it('kebab-cases every capital in camelCase tokens', () => {
    expect(cssVarName('boroughFill')).toBe('--color-borough-fill')
    expect(cssVarName('boroughLabelHalo')).toBe('--color-borough-label-halo')
  })
})

describe('contrast helper', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(luminance('#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('lightTheme', () => {
  it('writes every colour as lowercase #rrggbb', () => {
    const all = [
      ...Object.values(lightTheme.color),
      ...Object.values(lightTheme.story).flatMap((p) => [p.accent, ...p.ramp]),
    ]
    for (const value of all) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('gives every story a five-step ramp that darkens at each step', () => {
    for (const [story, palette] of Object.entries(lightTheme.story)) {
      expect(palette.ramp, story).toHaveLength(5)
      const l = palette.ramp.map(luminance)
      for (let i = 1; i < l.length; i++) expect(l[i], `${story} step ${i}`).toBeLessThan(l[i - 1])
    }
  })

  it('draws land lighter than the water around it', () => {
    expect(luminance(lightTheme.color.boroughFill)).toBeGreaterThan(luminance(lightTheme.color.mapWater))
  })

  it('keeps each story number readable on the story-button track', () => {
    for (const [story, p] of Object.entries(lightTheme.story)) {
      expect(contrastRatio(p.accent, lightTheme.color.tabTrack), story).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps non-text UI colours at 3:1 or better on the background', () => {
    expect(contrastRatio(lightTheme.color.inkFaint, lightTheme.color.background)).toBeGreaterThanOrEqual(3)
  })

  it('keeps firehouse markers visible on every map colour: the fill or the ring at 3:1 or better', () => {
    const c = lightTheme.color
    const grounds = [c.boroughFill, c.mapWater, ...Object.values(lightTheme.story).flatMap((s) => s.ramp)]
    for (const ground of grounds) {
      expect(Math.max(contrastRatio(c.firehouse, ground), contrastRatio(c.firehouseRing, ground)), ground).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps the hover card’s strip visible against the card', () => {
    const c = lightTheme.color
    expect(contrastRatio(c.tooltipInkFaint, c.tooltipTrack), 'borough average tick').toBeGreaterThanOrEqual(1.8)
    expect(contrastRatio(c.tooltipInk, c.tooltipTrack), 'city average tick').toBeGreaterThanOrEqual(3)
  })

  it('keeps text colours at 4.5:1 or better on their backgrounds', () => {
    const c = lightTheme.color
    const pairs: Array<[string, string, string]> = [
      ['ink', c.ink, c.background],
      ['inkSecondary', c.inkSecondary, c.background],
      ['inkMuted', c.inkMuted, c.background],
      ['inkMuted on sunken', c.inkMuted, c.surfaceSunken],
      ['focus', c.focus, c.background],
      ['badgeInk', c.badgeInk, c.badge],
      ['tooltipInk', c.tooltipInk, c.tooltip],
      ['tooltipInkMuted', c.tooltipInkMuted, c.tooltip],
      ['tooltipInkFaint', c.tooltipInkFaint, c.tooltip],
      ['tooltipInkMuted on raised', c.tooltipInkMuted, c.tooltipRaised],
      ['tooltipInkFaint on raised', c.tooltipInkFaint, c.tooltipRaised],
      ['tooltipInk on raised', c.tooltipInk, c.tooltipRaised],
      ...Object.entries(lightTheme.story).map(
        ([story, p]): [string, string, string] => [`${story} accent`, p.accent, c.background],
      ),
    ]
    for (const [name, fg, bg] of pairs) {
      expect(contrastRatio(fg, bg), name).toBeGreaterThanOrEqual(4.5)
    }
  })
})
