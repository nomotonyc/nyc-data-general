/** Every colour in the app. Nothing else defines one. */
export const lightTheme = {
  color: {
    background: '#ffffff',
    /** Flat and neutral; data will colour this later. */
    boroughFill: '#ebecee',
    boroughLine: '#cbcdd0',
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
