import { describe, expect, it } from 'vitest'
import { PHONE_LAYOUT, STACKED_LAYOUT } from '../map/config'

// Stylesheets can't import the TypeScript breakpoints, so this keeps them the same.
// (vite.config.ts lets raw stylesheets through; Vitest otherwise empties every stylesheet.)
const sheets = import.meta.glob<string>('../**/*.css', { query: '?raw', import: 'default', eager: true })

/** A component's own breakpoint, for its own content rather than the page's layout. */
const OWN: Record<string, string[]> = {
  // The expanded trend's four stats go two by two when the dialog is narrow.
  './panel/TrendDialog.css': ['(max-width: 720px)'],
}

describe('breakpoints', () => {
  it('are only the stacked and phone layouts, in every stylesheet, besides a component’s own', () => {
    let found = 0
    for (const [file, css] of Object.entries(sheets)) {
      for (const [, query] of css.matchAll(/@media\s+(\((?:max|min)-width:[^)]*\))/g)) {
        expect([STACKED_LAYOUT, PHONE_LAYOUT, ...(OWN[file] ?? [])], `${file}: ${query}`).toContain(query)
        found++
      }
    }
    expect(found).toBeGreaterThan(0)
  })
})
