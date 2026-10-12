import type { HoverDetails } from '../map/hover'
import { CardClose } from './CardClose'
import { useSheet } from './dialog'
import { useCardPosition } from './useCardPosition'
import './MapTooltip.css'

type Props = {
  details: HoverDetails
  dotColor: string
} & (
  | {
      /** Pointer position within the map, in pixels. */
      pointer: { x: number; y: number }
      /** The map's size, which the card must stay inside. */
      area: { width: number; height: number }
      sheet?: never
    }
  | {
      /** Opened by a tap: placed by the stylesheet, closable, with its action as a button. */
      sheet: { onAction: () => void; onClose: () => void }
      pointer?: never
      area?: never
    }
)

/**
 * The dark card that follows the pointer over the map. Hidden from screen
 * readers: it tracks the mouse, and the focus panel carries the same facts.
 * Opened by a tap, it stays put as a sheet, read out and closable.
 */
export function MapTooltip({ details, dotColor, pointer, area, sheet }: Props) {
  const { strip } = details
  const ref = useCardPosition(pointer, area)
  useSheet(ref, sheet?.onClose)

  return (
    <div
      ref={ref}
      className={sheet ? 'map-tooltip map-tooltip--sheet' : 'map-tooltip'}
      {...(sheet ? { role: 'region', tabIndex: -1, 'aria-label': details.title } : { 'aria-hidden': true })}
    >
      <div className="map-tooltip__head">
        <span className="map-tooltip__title">{details.title}</span>
        <span className="map-tooltip__subtitle">{details.subtitle}</span>
        {sheet && <CardClose onClose={sheet.onClose} />}
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
      {sheet ? (
        <button type="button" className="map-tooltip__action" onClick={sheet.onAction}>
          {details.action}
        </button>
      ) : (
        <div className="map-tooltip__hint">{details.hint}</div>
      )}
    </div>
  )
}
