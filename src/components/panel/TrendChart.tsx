import type { SVGProps } from 'react'
import type { ChartSize, ExpandedTrend } from '../../panel/expandedTrend'
import { useTheme } from '../../theme/context'
import './TrendDialog.css'

type Props = {
  big: ExpandedTrend
  /** Where it draws, at its real size (chartSize). */
  size: ChartSize
  /** Whether the period pointed at shows: its guide, highlighted dots and label. */
  marked: boolean
} & Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'className' | 'ref'>

/**
 * The larger trend's chart: gridlines and values, period labels, the lines with their dots, and
 * the period pointed at. Drawn in the dialog, which reads it by pointer and keyboard (the rest of
 * its props), and in a picture of the whole view.
 */
export function TrendChart({ big, size, marked, ...svg }: Props) {
  const theme = useTheme()
  return (
    <svg className="trend-dialog__chart" viewBox={`0 0 ${size.width} ${size.height}`} {...svg}>
      {big.grid.map((g) => (
        <g key={g.y}>
          <line x1={size.left} y1={g.y} x2={size.right} y2={g.y} className="trend-dialog__grid" />
          <text x={size.left - 8} y={g.y + 4} textAnchor="end" className="trend-dialog__tick">
            {g.text}
          </text>
        </g>
      ))}
      <line x1={size.left} y1={size.baseline} x2={size.right} y2={size.baseline} className="trend-dialog__baseline" />
      {big.ticks.map((k) => (
        <text key={k.x} x={k.x} y={size.baseline + 22} textAnchor="middle" className={`trend-dialog__tick${marked && k.current ? ' trend-dialog__tick--current' : ''}`}>
          {k.text}
        </text>
      ))}
      {marked && <line x1={big.guideX} y1={16} x2={big.guideX} y2={size.baseline} className="trend-dialog__guide" />}
      {big.lines.map((line) => (
        <g key={line.name}>
          <polyline
            points={line.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={line.colour}
            strokeWidth={line.width}
            strokeLinejoin="round"
          />
          {line.dots
            .filter((d) => marked || !d.highlight)
            .map((d) => (
              <circle
                key={`${d.x}-${d.highlight}`}
                className={d.highlight ? 'trend-dialog__marker' : undefined}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill={d.filled ? line.colour : theme.color.background}
                stroke={d.highlight ? theme.color.background : line.colour}
                strokeWidth={2}
              />
            ))}
        </g>
      ))}
    </svg>
  )
}

/**
 * The key to the trend's lines; with `values`, the period pointed at and each line's value there
 * too. A picture takes the key alone, on one line: a single month's figures would read as its point.
 */
export function TrendReadout({ big, values }: { big: ExpandedTrend; values: boolean }) {
  return (
    <div className={values ? 'trend-dialog__readout' : 'trend-dialog__readout trend-dialog__readout--key'} role="status">
      {values && <span className="trend-dialog__readout-period">{big.readout.period}</span>}
      {big.readout.values.map((r) => (
        <span key={r.name} className="trend-dialog__readout-item">
          <span className="trend-dialog__readout-dot" style={{ background: r.colour }} aria-hidden="true" />
          <span className="trend-dialog__readout-name">{r.name}</span>
          {values && <span className="trend-dialog__readout-value">{r.value}</span>}
        </span>
      ))}
    </div>
  )
}
