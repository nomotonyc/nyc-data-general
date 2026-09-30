import { useDataset, useExplorerState } from '../../explorer/context'
import { focusSummary } from '../../panel/focus'

export function FocusSummary() {
  const state = useExplorerState()
  const s = focusSummary(state, useDataset())
  return (
    <section className="panel__section" aria-label="In focus">
      <div className="panel__kicker">In focus</div>
      <h2 className="panel__name">{s.name}</h2>
      <div className="panel__context">{s.context}</div>
      <div className="panel__headline">
        <span className="panel__value">{s.value}</span>
        <span className="panel__unit">{s.unit}</span>
      </div>
      <div className={`panel__comparison panel__comparison--${s.tone}`}>{s.comparison}</div>
    </section>
  )
}
