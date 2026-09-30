import { describe, expect, it } from 'vitest'
import { cssVarName } from './tokens'

describe('cssVarName', () => {
  it('prefixes single-word tokens with --color-', () => {
    expect(cssVarName('background')).toBe('--color-background')
  })

  it('kebab-cases every capital in camelCase tokens', () => {
    expect(cssVarName('boroughFill')).toBe('--color-borough-fill')
    expect(cssVarName('boroughLabelHalo')).toBe('--color-borough-label-halo')
  })
})
