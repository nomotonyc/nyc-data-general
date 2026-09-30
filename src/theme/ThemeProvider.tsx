import { useLayoutEffect, type ReactNode } from 'react'
import { ThemeContext } from './context'
import { cssVarName, lightTheme, type Theme } from './tokens'

type Props = {
  theme?: Theme
  children: ReactNode
}

/** Exposes the theme as React context and as --color-* properties on :root. */
export function ThemeProvider({ theme = lightTheme, children }: Props) {
  // Layout effect: the properties must exist before first paint.
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [token, value] of Object.entries(theme.color)) {
      root.style.setProperty(cssVarName(token), value)
    }
  }, [theme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
