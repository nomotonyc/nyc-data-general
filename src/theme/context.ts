import { createContext, useContext } from 'react'
import { lightTheme, type Theme } from './tokens'

export const ThemeContext = createContext<Theme>(lightTheme)

/** Read the active theme from TypeScript. Stylesheets use var(--color-*). */
export function useTheme() {
  return useContext(ThemeContext)
}
