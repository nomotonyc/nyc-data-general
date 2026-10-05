import { useId } from 'react'
import { GEOGRAPHIES, areaNoun } from '../../domain/geography'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { activeMetric } from '../../explorer/state'
import { layerGeographies } from '../../layers'

/** Precincts or battalions: the areas the map, panel and lists use below the boroughs. */
export function AreaSwitch() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const layer = activeMetric(state)
  const available = layerGeographies(layer)

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Areas
      </h2>
      <div className="rail__segmented" role="group" aria-labelledby={headingId}>
        {GEOGRAPHIES.map((g) => (
          <button
            key={g}
            type="button"
            className="rail__segment"
            aria-pressed={state.geography === g}
            disabled={!available.includes(g)}
            onClick={() => dispatch({ type: 'setGeography', geography: g })}
          >
            {areaNoun(g).title}
          </button>
        ))}
      </div>
      {!available.includes('battalions') && <p className="rail__note">{layer.label} isn’t available by battalion yet.</p>}
    </section>
  )
}
