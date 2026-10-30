import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithExplorer } from '../../test/renderWithExplorer'
import { StoryTabs } from './StoryTabs'

const story = (name: RegExp) => screen.getByRole('button', { name })

describe('StoryTabs', () => {
  it('offers the three stories and Analysis in order', () => {
    renderWithExplorer(<StoryTabs />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['01 Demographic', '02 Fire', '03 Medical', '04 Analysis'])
  })

  it('marks the current story as pressed', () => {
    renderWithExplorer(<StoryTabs />)
    expect(story(/Demographic/)).toHaveAttribute('aria-pressed', 'true')
    expect(story(/Fire/)).toHaveAttribute('aria-pressed', 'false')
    expect(story(/Analysis/)).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks Analysis as pressed instead of a story', () => {
    renderWithExplorer(<StoryTabs analysis />)
    expect(story(/Analysis/)).toHaveAttribute('aria-pressed', 'true')
    expect(story(/Demographic/)).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches story on click', async () => {
    renderWithExplorer(<StoryTabs />)
    await userEvent.click(story(/Fire/))
    expect(story(/Fire/)).toHaveAttribute('aria-pressed', 'true')
    expect(story(/Demographic/)).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows each story’s question on hover', () => {
    renderWithExplorer(<StoryTabs />)
    expect(story(/Fire/)).toHaveAttribute('title', 'Where fires start, and why')
  })
})
