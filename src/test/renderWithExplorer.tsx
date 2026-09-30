import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ExplorerProvider } from '../explorer/ExplorerProvider'
import { initialExplorerState, type ExplorerState } from '../explorer/state'
import { ThemeProvider } from '../theme/ThemeProvider'

/** Renders `ui` inside the theme and explorer providers, starting from `state` over the initial state. */
export function renderWithExplorer(ui: ReactElement, state: Partial<ExplorerState> = {}) {
  return render(
    <ThemeProvider>
      <ExplorerProvider initialState={{ ...initialExplorerState, ...state }}>{ui}</ExplorerProvider>
    </ThemeProvider>,
  )
}
