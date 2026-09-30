import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { YearRange } from './YearRange'

const from = () => screen.getByLabelText('From')
const to = () => screen.getByLabelText('to')
const optionsOf = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent)

describe('YearRange', () => {
  it('starts on the latest full year', () => {
    renderWithExplorer(<YearRange />)
    expect(from()).toHaveValue('2025')
    expect(to()).toHaveValue('2025')
  })

  it('labels the partial final year', () => {
    renderWithExplorer(<YearRange />)
    expect(optionsOf(from())).toEqual(['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026 (Jan–Jun)'])
  })

  it('offers To years from From onward', () => {
    renderWithExplorer(<YearRange />)
    expect(optionsOf(to())).toEqual(['2025', '2026 (Jan–Jun)'])
  })

  it('keeps To when From moves earlier', async () => {
    renderWithExplorer(<YearRange />)
    await userEvent.selectOptions(from(), '2019')
    expect(to()).toHaveValue('2025')
    expect(optionsOf(to())).toHaveLength(8)
  })

  it('moves To up when From passes it', async () => {
    renderWithExplorer(<YearRange />)
    await userEvent.selectOptions(from(), '2026')
    expect(to()).toHaveValue('2026')
  })

  it('sets To', async () => {
    renderWithExplorer(<YearRange />, { yearFrom: 2019 })
    await userEvent.selectOptions(to(), '2021')
    expect(to()).toHaveValue('2021')
  })
})
