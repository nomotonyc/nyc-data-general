import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MapSettings } from './MapSettings'

const settings = () =>
  render(
    <MapSettings>
      <label>
        <input type="checkbox" /> Firehouses
      </label>
    </MapSettings>,
  )

describe('MapSettings', () => {
  it('opens its settings in a sheet, closed to start', async () => {
    settings()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Map settings' }))
    expect(screen.getByRole('dialog', { name: 'Map settings' })).toContainElement(screen.getByRole('checkbox', { name: 'Firehouses' }))
  })

  it('stays open while settings change, so several can be changed at once', async () => {
    settings()
    await userEvent.click(screen.getByRole('button', { name: 'Map settings' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Firehouses' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('leaves focus on the control just changed, though the page re-renders around it', async () => {
    function Page() {
      const [on, setOn] = useState(false)
      return (
        <MapSettings>
          <label>
            <input type="checkbox" checked={on} onChange={() => setOn(!on)} /> Firehouses
          </label>
        </MapSettings>
      )
    }
    render(<Page />)
    await userEvent.click(screen.getByRole('button', { name: 'Map settings' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Firehouses' }))
    expect(screen.getByRole('checkbox', { name: 'Firehouses' })).toHaveFocus()
  })

  it('closes with Done, Escape or the backdrop, and gives focus back to its button', async () => {
    settings()
    const open = screen.getByRole('button', { name: 'Map settings' })
    await userEvent.click(open)
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()

    await userEvent.click(open)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(open)
    await userEvent.click(screen.getByTestId('map-settings-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
