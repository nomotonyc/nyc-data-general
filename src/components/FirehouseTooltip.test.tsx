import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { lightTheme } from '../theme/tokens'
import { FirehouseTooltip } from './FirehouseTooltip'

const details = {
  address: '172 Tillary Street',
  place: 'Downtown Brooklyn, Brooklyn',
  groups: [
    {
      label: 'Companies',
      units: [
        { kind: 'Engine' as const, label: 'Engine 207' },
        { kind: 'Ladder' as const, label: 'Ladder 110' },
      ],
    },
    { label: 'Command', units: [{ kind: 'Battalion' as const, label: 'Battalion 31' }] },
  ],
  area: 'In Battalion 31',
}
const fire = lightTheme.story.fire
const at = { palette: fire, pointer: { x: 10, y: 10 }, area: { width: 800, height: 600 } }

describe('FirehouseTooltip', () => {
  it('leads with the address, then lists each unit based there, by group', () => {
    const { container } = render(<FirehouseTooltip details={details} {...at} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.querySelector('.map-tooltip__title')).toHaveTextContent('172 Tillary Street')
    expect(within(card).getByText('Downtown Brooklyn, Brooklyn')).toBeInTheDocument()
    const companies = within(card).getByText('Companies').parentElement!
    expect([...companies.querySelectorAll('.firehouse-card__unit')].map((u) => u.textContent)).toEqual(['Engine 207', 'Ladder 110'])
    expect(within(card).getByText('In Battalion 31')).toBeInTheDocument()
  })

  it('colours each company by its kind in the story’s colours, and leaves commands plain', () => {
    render(<FirehouseTooltip details={details} {...at} />)
    expect(screen.getByText('Engine 207')).toHaveStyle({ backgroundColor: fire.ramp[2] })
    expect(screen.getByText('Ladder 110')).toHaveStyle({ backgroundColor: fire.ramp[4] })
    expect(screen.getByText('Battalion 31').getAttribute('style')).toBeNull()
  })

  it('is the same dark card as the area card, hidden from screen readers like it', () => {
    const { container } = render(<FirehouseTooltip details={details} {...at} />)
    expect(container.firstElementChild).toHaveClass('map-tooltip')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('leaves out the area line when the firehouse is in no battalion area', () => {
    render(<FirehouseTooltip details={{ ...details, area: null }} {...at} />)
    expect(screen.queryByText(/In Battalion/)).not.toBeInTheDocument()
  })
})
