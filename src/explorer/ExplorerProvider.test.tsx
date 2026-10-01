import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useDataset, useExplorerDispatch, useExplorerState } from './context'
import { ExplorerProvider } from './ExplorerProvider'
import { initialExplorerState } from './state'

function Probe() {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const ds = useDataset()
  return (
    <>
      <p>story {state.storyId}</p>
      <p>dataset {ds.layerId}</p>
      <button type="button" onClick={() => dispatch({ type: 'selectStory', storyId: 'fire' })}>
        Fire
      </button>
    </>
  )
}

describe('ExplorerProvider', () => {
  it('starts from the initial explorer state', () => {
    render(<ExplorerProvider><Probe /></ExplorerProvider>)
    expect(screen.getByText('story demographic')).toBeInTheDocument()
  })

  it('accepts a starting state', () => {
    render(<ExplorerProvider initialState={{ ...initialExplorerState, storyId: 'medical', metricId: 'ambulance-calls' }}><Probe /></ExplorerProvider>)
    expect(screen.getByText('story medical')).toBeInTheDocument()
  })

  it('applies dispatched actions and follows the story with its dataset', async () => {
    render(<ExplorerProvider><Probe /></ExplorerProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }))
    expect(screen.getByText('story fire')).toBeInTheDocument()
    // The dataset follows the story's first layer.
    expect(screen.getByText('dataset structural-fires')).toBeInTheDocument()
  })

  it('names the provider when a hook is used outside it', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/ExplorerProvider/)
    quiet.mockRestore()
  })
})
