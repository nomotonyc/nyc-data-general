import { useId } from 'react'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { areaNoun } from '../../domain/geography'
import { effectiveDetail, type Detail } from '../../explorer/state'

export function DetailToggle() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const detail = effectiveDetail(state)
  const focused = state.borough !== null
  const noun = areaNoun(state.geography)
  const options: ReadonlyArray<[Detail, string]> = [
    ['borough', 'Boroughs'],
    ['area', noun.title],
  ]

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Detail
      </h2>
      <div className="rail__segmented" role="group" aria-labelledby={headingId}>
        {options.map(([value, label]) => (
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
      {focused && <p className="rail__note">Focused views always show {noun.many}.</p>}
    </section>
  )
}
