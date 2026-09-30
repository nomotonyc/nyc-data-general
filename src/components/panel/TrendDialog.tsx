import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useDataset, useExplorerState } from '../../explorer/context'
import { BIG, expandedTrend } from '../../panel/expandedTrend'
import { trend } from '../../panel/trend'
import { useTheme } from '../../theme/context'
import './TrendDialog.css'

const FOCUSABLE = 'button:not([tabindex="-1"]), [tabindex="0"]'

/** The larger trend: stats, gridlines and a readout for the hovered period. Escape, Close or the backdrop close it. */
export function TrendDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const state = useExplorerState()
  const ds = useDataset()
  const theme = useTheme()
  const [hover, setHover] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const palette = { accent: theme.story[state.storyId].accent, ramp: theme.story[state.storyId].ramp, city: theme.color.trendCity }
  const big = expandedTrend(state, ds, palette, hover)
  const { aria, note } = trend(state, ds, palette)

  // Focus moves in on open and back to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!big) return null
  const last = big.columns.length - 1

  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const end = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      end.focus()
    } else if (!e.shiftKey && document.activeElement === end) {
      e.preventDefault()
      first.focus()
    }
  }

  const step = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: big.hovered - 1, ArrowRight: big.hovered + 1, Home: 0, End: last }
    if (!(e.key in moves)) return
    e.preventDefault()
    setHover(Math.min(last, Math.max(0, moves[e.key])))
  }

  return createPortal(
    <div className="trend-dialog" style={{ '--story-accent': palette.accent } as CSSProperties}>
      <div className="trend-dialog__backdrop" data-testid="trend-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} className="trend-dialog__box" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapTab}>
        <div className="trend-dialog__head">
          <div className="trend-dialog__heading">
            <div className="trend-dialog__kicker">{big.kicker}</div>
            <h2 id={titleId} className="trend-dialog__title">
              {big.title}
            </h2>
            <div className="trend-dialog__sub">{big.sub}</div>
          </div>
          <button ref={closeRef} type="button" className="trend-dialog__close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        <div className="trend-dialog__stats">
          {big.stats.map((s) => (
            <div key={s.label} className="trend-dialog__stat">
              <span className="trend-dialog__stat-label">{s.label}</span>
              <span className="trend-dialog__stat-value">{s.value}</span>
              <span className="trend-dialog__stat-note">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="trend-dialog__readout" role="status">
          <span className="trend-dialog__readout-period">{big.readout.period}</span>
          {big.readout.values.map((r) => (
            <span key={r.name} className="trend-dialog__readout-item">
              <span className="trend-dialog__readout-dot" style={{ background: r.colour }} aria-hidden="true" />
              {r.name}
              <span className="trend-dialog__readout-value">{r.value}</span>
            </span>
          ))}
        </div>

        <svg
          className="trend-dialog__chart"
          viewBox={`0 0 ${BIG.width} ${BIG.height}`}
          role="img"
          aria-label={`${aria}. Use the arrow keys to read each period.`}
          tabIndex={0}
          onKeyDown={step}
          onMouseLeave={() => setHover(null)}
        >
          {big.grid.map((g) => (
            <g key={g.y}>
              <line x1={BIG.left} y1={g.y} x2={BIG.right} y2={g.y} className="trend-dialog__grid" />
              <text x={BIG.left - 8} y={g.y + 4} textAnchor="end" className="trend-dialog__tick">
                {g.text}
              </text>
            </g>
          ))}
          <line x1={BIG.left} y1={BIG.baseline} x2={BIG.right} y2={BIG.baseline} className="trend-dialog__baseline" />
          {big.ticks.map((k) => (
            <text key={k.x} x={k.x} y={BIG.baseline + 22} textAnchor="middle" className={`trend-dialog__tick${k.current ? ' trend-dialog__tick--current' : ''}`}>
              {k.text}
            </text>
          ))}
          <line x1={big.guideX} y1={16} x2={big.guideX} y2={BIG.baseline} className="trend-dialog__guide" />
          {big.lines.map((line) => (
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
                  key={`${d.x}-${d.highlight}`}
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
          {big.columns.map((c, i) => (
            <rect key={c.x} data-period={i} x={c.x} y={16} width={c.width} height={BIG.baseline - 16} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {note && <p className="trend-dialog__note">{note}</p>}
      </div>
    </div>,
    document.body,
  )
}
