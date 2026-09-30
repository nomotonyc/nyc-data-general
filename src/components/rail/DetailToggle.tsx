import { useId } from 'react'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { effectiveDetail, type Detail } from '../../explorer/state'

const OPTIONS: ReadonlyArray<[Detail, string]> = [
  ['borough', 'Boroughs'],
  ['precinct', 'Precincts'],
]

export function DetailToggle() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const detail = effectiveDetail(state)
  const focused = state.borough !== null

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Detail
      </h2>
      <div className="rail__segmented" role="group" aria-labelledby={headingId}>
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="rail__segment"
            aria-pressed={detail === value}
            disabled={focused}
            onClick={() => dispatch({ type: 'setDetail', detail: value })}
          >
            {label}
          </button>
        ))}
      </div>
      {focused && <p className="rail__note">Focused views always show precincts.</p>}
    </section>
  )
}
