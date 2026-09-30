import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTheme } from './context'
import { ThemeProvider } from './ThemeProvider'
import { cssVarName, lightTheme, type Theme } from './tokens'

function BackgroundName() {
  return <p>{useTheme().color.background}</p>
}

afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('ThemeProvider', () => {
  it('writes every colour token to :root as a CSS custom property', () => {
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>,
    )
    const style = document.documentElement.style
    // A literal name, so a broken cssVarName can't agree with itself.
    expect(style.getPropertyValue('--color-borough-fill')).toBe(lightTheme.color.boroughFill)
    for (const [token, value] of Object.entries(lightTheme.color)) {
      expect(style.getPropertyValue(cssVarName(token))).toBe(value)
    }
  })

  it('gives components the light theme by default', () => {
    render(
      <ThemeProvider>
        <BackgroundName />
      </ThemeProvider>,
    )
    expect(screen.getByText(lightTheme.color.background)).toBeInTheDocument()
  })

  it('uses a supplied theme for both context and CSS', () => {
    const custom: Theme = { ...lightTheme, color: { ...lightTheme.color, background: '#000000' } }
    render(
      <ThemeProvider theme={custom}>
        <BackgroundName />
      </ThemeProvider>,
    )
    expect(screen.getByText('#000000')).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('#000000')
  })
})
