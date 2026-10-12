import { useDataset, useExplorerState } from '../../explorer/context'
import { focusSummary } from '../../panel/focus'
import { SaveableSection } from './SaveableSection'

export function FocusSummary() {
  const state = useExplorerState()
  const s = focusSummary(state, useDataset())
  return (
    <SaveableSection of="focus" title="In focus" kicker>
      <h2 className="panel__name">{s.name}</h2>
      <div className="panel__context">{s.context}</div>
      <div className="panel__headline">
        <span className="panel__value">{s.value}</span>
        {s.unit && <span className="panel__unit">{s.unit}</span>}
      </div>
      <div className="panel__measure">{s.measure}</div>
      <div className={`panel__comparison panel__comparison--${s.tone}`}>{s.comparison}</div>
    </SaveableSection>
  )
}
