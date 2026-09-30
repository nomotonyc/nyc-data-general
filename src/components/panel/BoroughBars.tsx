import { useId } from 'react'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { boroughBars } from '../../panel/focus'
import { useTheme } from '../../theme/context'

export function BoroughBars() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const theme = useTheme()
  const bars = boroughBars(state, useDataset(), theme.story[state.storyId].ramp, theme.color.lineStrong)
  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel__title">
        How the boroughs compare
      </h3>
      {bars.map((bar) => (
        <button
          key={bar.borough}
          type="button"
          className="panel__bar"
          aria-pressed={bar.current}
          onClick={() => dispatch({ type: 'focusBorough', borough: bar.borough })}
        >
          <span className="panel__bar-label">{bar.borough}</span>
          <span className="panel__bar-track" aria-hidden="true">
            <span className="panel__bar-fill" style={{ width: `${bar.width}%`, background: bar.colour }} />
          </span>
          <span className="panel__bar-value">{bar.value}</span>
        </button>
      ))}
    </section>
  )
}
