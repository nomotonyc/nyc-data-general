import { useId } from 'react'
import { useDataset, useExplorerState } from '../../explorer/context'
import { breakdown } from '../../panel/breakdown'
import { useTheme } from '../../theme/context'

/** How the value splits into the layer's parts, for the place in focus. */
export function Breakdown() {
  const headingId = useId()
  const state = useExplorerState()
  const theme = useTheme()
  const b = breakdown(state, useDataset(), {
    ramp: theme.story[state.storyId].ramp,
    greys: [theme.color.inkFaint, theme.color.lineStrong],
  })

  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel__title">
        {b.title}
      </h3>
      <div className="panel__stack" aria-hidden="true">
        {b.parts.map((p) => (
          <span key={p.label} className="panel__stack-part" style={{ width: `${p.width}%`, background: p.colour }} />
        ))}
      </div>
      <ul className="panel__parts">
        {b.parts.map((p) => (
          <li key={p.label} className="panel__part">
            <span className="panel__part-swatch" style={{ background: p.colour }} aria-hidden="true" />
            <span className="panel__part-label">{p.label}</span>
            <span className="panel__part-share">{p.share}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
