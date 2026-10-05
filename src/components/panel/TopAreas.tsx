import { useId } from 'react'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { areaNoun } from '../../domain/geography'
import { topAreas } from '../../panel/focus'

/** The highest precincts or battalions in the focused borough, or the city; clicking one pins it. */
export function TopAreas() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const top = topAreas(state, useDataset())
  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel__title">
        Highest {areaNoun(state.geography).many} in {state.borough ?? 'the city'}
      </h3>
      {top.map((area) => (
        <button
          key={area.id}
          type="button"
          className="panel__top"
          aria-pressed={area.pinned}
          onClick={() => dispatch({ type: 'pinArea', id: area.id })}
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
