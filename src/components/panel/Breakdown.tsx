import { useDataset, useExplorerState } from '../../explorer/context'
import { breakdown } from '../../panel/breakdown'
import { useTheme } from '../../theme/context'
import { SaveableSection } from './SaveableSection'

/** How the value splits into the layer's parts, for the place in focus. */
export function Breakdown() {
  const state = useExplorerState()
  const theme = useTheme()
  const b = breakdown(state, useDataset(), {
    ramp: theme.story[state.storyId].ramp,
    greys: [theme.color.inkFaint, theme.color.lineStrong],
  })
  // Stack from the smallest share at the top to the largest at the bottom. Reassign the existing
  // palette in that visual order so it runs from grey/light at the top to darkest at the bottom.
  const colours = b.parts.map((part) => part.colour).reverse()
  const parts = [...b.parts]
    .sort((a, z) => a.width - z.width)
    .map((part, index) => ({ ...part, colour: colours[index] }))

  return (
    <SaveableSection of="focus" title={b.title}>
      <div className="panel__breakdown">
        <ul className="panel__parts">
          {parts.map((p) => (
            <li key={p.label} className="panel__part">
              <span className="panel__part-swatch" style={{ background: p.colour }} aria-hidden="true" />
              <span className="panel__part-label">{p.label}</span>
              <span className="panel__part-share">{p.share}</span>
            </li>
          ))}
        </ul>
        <div className="panel__stack" role="img" aria-label={`${b.title}, stacked by percentage`}>
          {parts.map((p) => (
            <span key={p.label} className="panel__stack-part" style={{ height: `${p.width}%`, background: p.colour }} />
          ))}
        </div>
      </div>
    </SaveableSection>
  )
}
