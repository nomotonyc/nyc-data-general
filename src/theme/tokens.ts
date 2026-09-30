/** Every colour in the app. Nothing else defines one. */
export const lightTheme = {
  color: {
    background: '#ffffff',
    /** Land before data colours it: white on the pale water, as in the design. */
    boroughFill: '#ffffff',
    /** Stroke between filled areas. */
    boroughLine: '#ffffff',
    boroughLabel: '#39414c',
    boroughLabelHalo: '#ffffff',

    ink: '#16202b',
    inkSecondary: '#45505c',
    inkMuted: '#56606b',
    line: '#dde1e5',
    lineStrong: '#c9ced4',
    /** Separators and unselected control rings; UI-only, never body text. */
    inkFaint: '#8a939d',
    /** Track behind the story buttons. */
    tabTrack: '#f0f2f5',
    surfaceSunken: '#eef1f4',
    mapWater: '#f5f6f8',
    focus: '#2a5db8',
    badge: '#fff4d6',
    badgeInk: '#6b4e00',
    tooltip: '#16202b',
    tooltipInk: '#ffffff',
    tooltipInkMuted: '#b8c0c9',
    /** Secondary labels on the hover card; also the borough-average tick. */
    tooltipInkFaint: '#8fa0b2',
    /** Rank boxes on the hover card. */
    tooltipRaised: '#222e3b',
    /** The average strip's track on the hover card. */
    tooltipTrack: '#3a4958',
    /** The dimmed New York City line behind a focused place's trend. */
    trendCity: '#a7afb8',
  },
  /** Accent for text and the focused trend line; ramp for choropleths, light to dark. */
  story: {
    demographic: { accent: '#2a5db8', ramp: ['#dce7f7', '#a9c4ee', '#6c9be0', '#3a70c9', '#1f4a94'] },
    fire: { accent: '#b8481a', ramp: ['#fce3d3', '#f7b48c', '#ee8350', '#d4561f', '#9c3610'] },
    medical: { accent: '#0e7469', ramp: ['#d5eeea', '#98d4cb', '#52b2a6', '#1e8a7e', '#0d5c54'] },
  },
} as const

export type ColorToken = keyof typeof lightTheme.color
export type StoryKey = keyof typeof lightTheme.story

export type StoryPalette = {
  accent: string
  ramp: readonly [string, string, string, string, string]
}

export type Theme = {
  color: Record<ColorToken, string>
  story: Record<StoryKey, StoryPalette>
}

/** `boroughFill` -> `--color-borough-fill` */
export function cssVarName(token: string) {
  return `--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}
