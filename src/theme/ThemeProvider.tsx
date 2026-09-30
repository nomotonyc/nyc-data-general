import { useLayoutEffect, type ReactNode } from 'react'
import { ThemeContext } from './context'
import { cssVarName, lightTheme, type Theme } from './tokens'

type Props = {
  theme?: Theme
  children: ReactNode
}

/**
 * Publishes the theme twice from one definition: as React context for
 * TypeScript, and as --color-* custom properties for every stylesheet. Any
 * number of CSS files can consume the colours without redefining them.
 */
export function ThemeProvider({ theme = lightTheme, children }: Props) {
  // Layout effect, not effect: the custom properties must exist before the
  // browser paints, or the first frame renders unstyled.
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [token, value] of Object.entries(theme.color)) {
      root.style.setProperty(cssVarName(token), value)
    }
  }, [theme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
