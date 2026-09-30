import { createContext, useContext, type Dispatch } from 'react'
import type { LayerDataset } from '../data/dataset'
import { getDataset } from '../data/load'
import type { ExplorerAction, ExplorerState } from './state'

export const ExplorerStateContext = createContext<ExplorerState | null>(null)
export const ExplorerDispatchContext = createContext<Dispatch<ExplorerAction> | null>(null)

export function useExplorerState(): ExplorerState {
  const state = useContext(ExplorerStateContext)
  if (!state) throw new Error('useExplorerState must be used inside ExplorerProvider')
  return state
}

export function useExplorerDispatch(): Dispatch<ExplorerAction> {
  const dispatch = useContext(ExplorerDispatchContext)
  if (!dispatch) throw new Error('useExplorerDispatch must be used inside ExplorerProvider')
  return dispatch
}

/** The active layer's dataset. */
export function useDataset(): LayerDataset {
  return getDataset(useExplorerState().metricId)
}
