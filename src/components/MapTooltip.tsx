import { useLayoutEffect, useRef } from 'react'
import { tooltipPosition, type HoverDetails } from '../map/hover'
import './MapTooltip.css'

type Props = {
  details: HoverDetails
  dotColor: string
  /** Pointer position within the map, in pixels. */
  pointer: { x: number; y: number }
  /** The map's size, which the card must stay inside. */
  area: { width: number; height: number }
}

/**
 * The dark card that follows the pointer over the map. Hidden from screen
 * readers: it tracks the mouse, and the focus panel carries the same facts.
 */
export function MapTooltip({ details, dotColor, pointer, area }: Props) {
  const { strip } = details
  const ref = useRef<HTMLDivElement>(null)

  // Placed from its real rendered size (cards differ in height), before the
  // browser paints, so it never shows cut off or in the wrong spot.
  useLayoutEffect(() => {
    const card = ref.current
    if (!card) return
    const { left, top } = tooltipPosition(pointer, { width: card.offsetWidth, height: card.offsetHeight }, area)
    card.style.left = `${left}px`
    card.style.top = `${top}px`
  })

  return (
    <div ref={ref} className="map-tooltip" aria-hidden="true">
      <div className="map-tooltip__head">
        <span className="map-tooltip__title">{details.title}</span>
        <span className="map-tooltip__subtitle">{details.subtitle}</span>
      </div>
      <div>
        <div className="map-tooltip__metric">{details.metric}</div>
        <div className="map-tooltip__value">{details.value}</div>
      </div>
      <div className="map-tooltip__ranks">
        {details.ranks.map((r) => (
          <div key={r.label} className="map-tooltip__rank">
            <span className="map-tooltip__rank-label">{r.label}</span>
            <span className="map-tooltip__rank-value">{r.rank}</span>
            <span className="map-tooltip__rank-of">{r.of}</span>
          </div>
        ))}
      </div>
      <div className="map-tooltip__caption">{strip.caption}</div>
      <div className="map-tooltip__strip">
        <span className="map-tooltip__track" />
        {strip.boroughAverage !== null && (
          <span className="map-tooltip__tick map-tooltip__tick--borough" style={{ left: `${strip.boroughAverage}%` }} />
        )}
        <span className="map-tooltip__tick map-tooltip__tick--city" style={{ left: `${strip.cityAverage}%` }} />
        <span className="map-tooltip__dot" style={{ left: `${strip.dot}%`, background: dotColor }} />
      </div>
      <div className="map-tooltip__ends">
        <span>Lowest {strip.lo}</span>
        <span>Highest {strip.hi}</span>
      </div>
      <div className="map-tooltip__comparisons">
        {details.comparisons.map((c, i) => (
          <span key={c} className="map-tooltip__comparison">
            <span className={`map-tooltip__key ${i === 0 ? 'map-tooltip__key--city' : 'map-tooltip__key--borough'}`} />
            {c}
          </span>
        ))}
      </div>
      <div className="map-tooltip__hint">{details.hint}</div>
    </div>
  )
}
