import { useId } from 'react'
import { GEOGRAPHIES, areaNoun } from '../../domain/geography'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { activeMetric } from '../../explorer/state'
import { layerGeographies } from '../../layers'

/** Selects the geography used by the map and the accompanying analytics. */
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
            {g === 'neighborhoods' ? 'Neighborhoods' : areaNoun(g).title}
          </button>
        ))}
      </div>
      {GEOGRAPHIES.filter((g) => !available.includes(g)).map((g) => (
        <p key={g} className="rail__note">{layer.label} isn’t available by {areaNoun(g).one} yet.</p>
      ))}
    </section>
  )
}
