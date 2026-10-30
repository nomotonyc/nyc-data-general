import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { areaNoun } from '../../domain/geography'
import { activeMetric } from '../../explorer/state'
import { topAreas } from '../../panel/focus'
import { SaveableSection } from './SaveableSection'

/** The leading precincts or battalions in the focused borough, or the city; clicking one pins it. */
export function TopAreas() {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const top = topAreas(state, useDataset())
  const superlative = activeMetric(state).format === 'minutes' ? 'Fastest' : 'Highest'
  const place = state.borough ?? 'the city'
  const title = `5 ${superlative} ${areaNoun(state.geography).many} in ${place}`
  return (
    <SaveableSection of="areas" title={title}>
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
    </SaveableSection>
  )
}
