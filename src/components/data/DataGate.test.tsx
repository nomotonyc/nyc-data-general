import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DatasetStore } from '../../data/load'
import { layerFileText } from '../../test/layerFiles'
import { DataGate } from './DataGate'

const file = (url: string) => new Response(layerFileText(url.split('/').pop()!.replace('.json', '')))

describe('DataGate', () => {
  it('says it is loading, then shows the app', async () => {
    render(<DataGate store={new DatasetStore(async (url) => file(url))}>app</DataGate>)
    expect(screen.getByRole('status')).toHaveTextContent('Loading data')
    expect(await screen.findByText('app')).toBeInTheDocument()
  })

  it('shows the app at once when the data is already loaded', async () => {
    const store = new DatasetStore(async (url) => file(url))
    await store.load()
    render(<DataGate store={store}>app</DataGate>)
    expect(screen.getByText('app')).toBeInTheDocument()
  })

  it('names what failed and offers to try again', async () => {
    let fail = true
    const store = new DatasetStore(async (url) => (fail ? new Response('', { status: 503 }) : file(url)))
    render(<DataGate store={store}>app</DataGate>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn’t load [A-Za-z -]+ data \(503\)/)
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('app')).toBeInTheDocument()
  })
})
