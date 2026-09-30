/**
 * The colour source for the whole application.
 *
 * Nothing else — no stylesheet, no component — may define a colour. Stylesheets
 * read these through the `--color-*` custom properties that ThemeProvider
 * writes onto :root; TypeScript reads them through `useTheme()`. Adding a
 * stylesheet never adds a second place colours can live.
 */
export const lightTheme = {
  color: {
    /** Page background, behind and around the city. */
    background: '#ffffff',
    /** Borough surface. Flat and neutral: data will colour this later. */
    boroughFill: '#dde3ea',
    /** Separator between adjacent boroughs. */
    boroughLine: '#ffffff',
    boroughLabel: '#39414c',
    boroughLabelHalo: '#ffffff',
  },
} as const

export type Theme = {
  color: Record<keyof typeof lightTheme.color, string>
}

/** `boroughFill` -> `--color-borough-fill` */
export function cssVarName(token: string) {
  return `--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}
