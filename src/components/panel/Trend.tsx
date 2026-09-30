import { useId } from 'react'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { trend } from '../../panel/trend'
import { useTheme } from '../../theme/context'
import { TrendDialog } from './TrendDialog'

/** The chosen years for the place in focus, wider places dimmed behind it, as in the design. */
export function Trend() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const theme = useTheme()
  const palette = { accent: theme.story[state.storyId].accent, ramp: theme.story[state.storyId].ramp, city: theme.color.trendCity }
  const t = trend(state, useDataset(), palette)
  const open = () => dispatch({ type: 'openTrend' })

  return (
    <section className="panel__section" aria-labelledby={headingId}>
      <div className="panel__trend-head">
        <h3 id={headingId} className="panel__title">
          Trend · {t.title}
        </h3>
        {!t.empty && (
          <button type="button" className="panel__expand" aria-label="Expand trend" onClick={open}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" />
            </svg>
            Expand
          </button>
        )}
      </div>
      <div className="panel__trend-meta">
        <span>{t.period}</span>
        {t.change && <span className="panel__trend-change">{t.change}</span>}
      </div>
      {t.empty ? (
        <p className="panel__trend-empty">{t.empty}</p>
      ) : (
        <button type="button" className="panel__trend-open" aria-label={`${t.aria}. Open a larger view`} onClick={open}>
          <svg className="panel__trend-chart" viewBox="0 0 296 100" aria-hidden="true">
            <line x1="0" y1="80" x2="296" y2="80" className="panel__trend-axis" />
            {t.lines.map((line) => (
              <g key={line.name}>
                <polyline
                  points={line.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={line.colour}
                  strokeWidth={line.width}
                  strokeLinejoin="round"
                />
                {line.dots.map((d) => (
                  <circle
                    key={`${d.x}`}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill={d.filled ? line.colour : theme.color.background}
                    stroke={line.colour}
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            ))}
            {t.ticks.map((tick) => (
              <text key={tick.x} x={tick.x} y="96" textAnchor={tick.anchor} className="panel__trend-tick">
                {tick.text}
              </text>
            ))}
          </svg>
        </button>
      )}
      {t.key.length > 0 && (
        <ul className="panel__trend-key" aria-label="Lines">
          {t.key.map((k) => (
            <li key={k.name}>
              <span className="panel__trend-swatch" style={{ background: k.colour }} aria-hidden="true" />
              {k.name}
            </li>
          ))}
        </ul>
      )}
      {t.note && <p className="panel__trend-note">{t.note}</p>}
      {state.trendOpen && !t.empty && <TrendDialog onClose={() => dispatch({ type: 'closeTrend' })} />}
    </section>
  )
}
