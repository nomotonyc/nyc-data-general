import { useId } from 'react'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { topAreas } from '../../panel/focus'

export function TopPrecincts() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const top = topAreas(state, useDataset())
  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel__title">
        Highest precincts in {state.borough ?? 'the city'}
      </h3>
      {top.map((area) => (
        <button
          key={area.id}
          type="button"
          className="panel__top"
          aria-pressed={area.pinned}
          onClick={() => dispatch({ type: 'pinPrecinct', precinct: area.precinct })}
        >
          <span className="panel__top-rank">{area.rank}</span>
          <span className="panel__top-name">
            <span className="panel__top-label">{area.label}</span>
            <span className="panel__top-borough">{area.borough}</span>
          </span>
          <span className="panel__top-value">{area.value}</span>
        </button>
      ))}
    </section>
  )
}
