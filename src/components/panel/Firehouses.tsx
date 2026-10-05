import { useId } from 'react'
import { FIREHOUSES } from '../../data/firehouses'
import { useExplorerState } from '../../explorer/context'
import { unitChip } from '../../map/unitColours'
import { firehouseScope, firehousesIn } from '../../panel/firehouses'
import { useTheme } from '../../theme/context'

/** A focused borough's or pinned battalion's firehouses: counts, companies by type, and for a battalion each firehouse. */
export function Firehouses() {
  const headingId = useId()
  const state = useExplorerState()
  const theme = useTheme()
  const scope = firehouseScope(state)
  if (!scope) return null
  const summary = firehousesIn(FIREHOUSES, scope)
  const palette = theme.story[state.storyId]
  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel__title">
        {summary.title}
      </h3>
      <p className="panel__firehouse-totals">{summary.totals}</p>
      <div className="panel__firehouse-kinds">
        {summary.byKind.map((k) => {
          const chip = unitChip(k.kind, palette, theme.color)
          return (
            <span key={k.kind} className="panel__firehouse-kind" style={chip ? { background: chip.background, color: chip.ink } : undefined}>
              {k.label}
            </span>
          )
        })}
      </div>
      {summary.list && (
        <ul className="panel__firehouse-list">
          {summary.list.map((f) => (
            <li key={f.id} className="panel__firehouse">
              <span className="panel__firehouse-address">{f.address}</span>
              <span className="panel__firehouse-units">{f.units}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
