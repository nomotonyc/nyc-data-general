import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../test/contrast'
import { lightTheme } from '../theme/tokens'
import { unitChip } from './unitColours'

const companies = ['Engine', 'Ladder', 'Squad', 'Rescue', 'Marine'] as const

describe('unitChip', () => {
  it('gives each kind of company its own story colour, in every story', () => {
    for (const palette of Object.values(lightTheme.story)) {
      const fills = companies.map((k) => unitChip(k, palette, lightTheme.color)!.background)
      expect(new Set(fills).size, palette.accent).toBe(companies.length)
    }
  })

  it('keeps every chip’s text readable on its fill, at 4.5:1 or better', () => {
    for (const palette of Object.values(lightTheme.story)) {
      for (const kind of companies) {
        const { background, ink } = unitChip(kind, palette, lightTheme.color)!
        expect(contrastRatio(ink, background), `${kind} in ${palette.accent}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('leaves commands uncoloured, so companies stand out', () => {
    expect(unitChip('Battalion', lightTheme.story.fire, lightTheme.color)).toBeNull()
  })
})
