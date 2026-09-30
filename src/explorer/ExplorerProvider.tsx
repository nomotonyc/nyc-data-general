import { useReducer, type ReactNode } from 'react'
import { ExplorerDispatchContext, ExplorerStateContext } from './context'
import { explorerReducer, initialExplorerState, type ExplorerState } from './state'

type Props = {
  children: ReactNode
  initialState?: ExplorerState
}

/** State and dispatch travel in separate contexts, so dispatch-only components don't re-render on every change. */
export function ExplorerProvider({ children, initialState = initialExplorerState }: Props) {
  const [state, dispatch] = useReducer(explorerReducer, initialState)
  return (
    <ExplorerStateContext.Provider value={state}>
      <ExplorerDispatchContext.Provider value={dispatch}>{children}</ExplorerDispatchContext.Provider>
    </ExplorerStateContext.Provider>
  )
}
