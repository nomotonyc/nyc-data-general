import { getStory } from '../../domain/stories'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'

/** One layer per story for now; more appear here as radio options. */
export function LayerPicker() {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()

  return (
    <fieldset className="rail__section">
      <legend className="rail__legend">
        <h2 className="rail__heading">Layer</h2>
      </legend>
      {getStory(state.storyId).metrics.map((metric) => (
        <label key={metric.id} className="rail__option rail__layer">
          <input
            type="radio"
            name="layer"
            value={metric.id}
            checked={metric.id === state.metricId}
            onChange={() => dispatch({ type: 'selectMetric', metricId: metric.id })}
          />
          <span className="rail__layer-text">
            <span className="rail__layer-label">{metric.label}</span>
            <span className="rail__layer-note">{metric.note}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
