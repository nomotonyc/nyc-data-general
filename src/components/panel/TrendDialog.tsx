import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { trapTab, useEscape } from '../dialog'
import { createPortal } from 'react-dom'
import { useDataset, useExplorerState } from '../../explorer/context'
import { BIG, chartSize, expandedTrend, periodAt } from '../../panel/expandedTrend'
import { trend } from '../../panel/trend'
import { useTheme } from '../../theme/context'
import { useWidth } from '../useWidth'
import { pictureCaption, pictureView, slug } from '../../panel/caption'
import { rangeLabel } from '../../domain/stories'
import { SaveImageButton } from '../SaveImageButton'
import { useSaveImage } from '../useSaveImage'
import '../Picture.css'
import './TrendDialog.css'

/**
 * The larger trend: stats, gridlines and a readout for the period pointed at (a mouse over it,
 * a finger dragged across it, or the arrow keys). Escape, Close or the backdrop close it, and
 * Save image keeps it as a picture.
 */
export function TrendDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const state = useExplorerState()
  const ds = useDataset()
  const theme = useTheme()
  const [hover, setHover] = useState<number | null>(null)
  const picture = useSaveImage(theme.color.background, pictureView(state))
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Drawn at the width it has, so a phone's chart keeps readable labels rather than shrinking.
  const [chartRef, chartWidth] = useWidth(BIG.width)
  const size = chartSize(chartWidth)
  const palette = { accent: theme.story[state.storyId].accent, ramp: theme.story[state.storyId].ramp, city: theme.color.trendCity }
  const big = expandedTrend(state, ds, palette, hover, size)
  const { aria, note } = trend(state, ds, palette)

  // Focus moves in on open and back to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus()
  }, [])

  useEscape(onClose)

  if (!big) return null
  // The month pointed at (its readout, guide, dots and label), shown except while saving a picture.
  const marked = !picture.saving
  const last = big.columns.length - 1

  // The dialog as it looks, named for what it shows (structural-fires-queens-2025), without its
  // buttons or the month pointed at: on its own, a picture of one month's figures reads as the point.
  const save = () =>
    picture.save(() => dialogRef.current && { node: dialogRef.current, name: `${slug(big.title)}-${slug(rangeLabel(big.years))}` })

  // The period under the pointer, from where the chart is drawn on screen.
  const point = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    if (box.width > 0) setHover(periodAt(big.columns, ((e.clientX - box.left) / box.width) * size.width))
  }
  // A mouse leaving goes back to the latest period; a lifted finger leaves its period read.
  const leave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setHover(null)
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
      <div ref={dialogRef} className="trend-dialog__box" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => trapTab(e, dialogRef.current)}>
        <div className="trend-dialog__head">
          <div className="trend-dialog__heading">
            <div className="trend-dialog__kicker">{big.kicker}</div>
            <h2 id={titleId} className="trend-dialog__title">
              {big.title}
            </h2>
            <div className="trend-dialog__sub">{big.sub}</div>
          </div>
          <div className="trend-dialog__actions">
            <SaveImageButton state={picture.button} onClick={save} labelled />
            <button ref={closeRef} type="button" className="trend-dialog__close" data-export="skip" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            </button>
          </div>
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

        {/* In a picture, the key to the lines stays, on one line; the month and its values go. */}
        <div className={marked ? 'trend-dialog__readout' : 'trend-dialog__readout trend-dialog__readout--key'} role="status">
          {marked && <span className="trend-dialog__readout-period">{big.readout.period}</span>}
          {big.readout.values.map((r) => (
            <span key={r.name} className="trend-dialog__readout-item">
              <span className="trend-dialog__readout-dot" style={{ background: r.colour }} aria-hidden="true" />
              <span className="trend-dialog__readout-name">{r.name}</span>
              {marked && <span className="trend-dialog__readout-value">{r.value}</span>}
            </span>
          ))}
        </div>

        <div ref={chartRef}>
          <svg
            className="trend-dialog__chart"
            viewBox={`0 0 ${size.width} ${size.height}`}
            role="img"
            aria-label={`${aria}. Use the arrow keys to read each period.`}
            tabIndex={0}
            onKeyDown={step}
            onPointerDown={point}
            onPointerMove={point}
            onPointerLeave={leave}
          >
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
        </div>
        {note && <p className="trend-dialog__note">{note}</p>}
        {picture.saving && <p className="picture__credit">{pictureCaption('focus', state, ds).credit}</p>}
      </div>
    </div>,
    document.body,
  )
}
