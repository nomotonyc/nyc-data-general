import { useId } from 'react'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'

export function MapToggles() {
  const headingId = useId()
  const { showOutlines, showLabels } = useExplorerState()
  const dispatch = useExplorerDispatch()

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Show on map
      </h2>
      <label className="rail__check">
        <input type="checkbox" checked={showOutlines} onChange={() => dispatch({ type: 'toggleOutlines' })} />
        Precinct outlines
      </label>
      <label className="rail__check">
        <input type="checkbox" checked={showLabels} onChange={() => dispatch({ type: 'toggleLabels' })} />
        Place labels
      </label>
    </section>
  )
}
