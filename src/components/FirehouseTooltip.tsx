import type { FirehouseDetails } from '../map/firehouseHover'
import { unitChip } from '../map/unitColours'
import { useTheme } from '../theme/context'
import type { StoryPalette } from '../theme/tokens'
import { useCardPosition } from './useCardPosition'
import './MapTooltip.css'
import './FirehouseTooltip.css'

type Props = {
  details: FirehouseDetails
  /** The current story's colours, which the companies take. */
  palette: StoryPalette
  /** Pointer position within the map, in pixels. */
  pointer: { x: number; y: number }
  /** The map's size, which the card must stay inside. */
  area: { width: number; height: number }
}

/** The hover card for a firehouse: the same dark card as for places, listing the units based there. */
export function FirehouseTooltip({ details, palette, pointer, area }: Props) {
  const ref = useCardPosition(pointer, area)
  const { color } = useTheme()
  return (
    <div ref={ref} className="map-tooltip firehouse-card" aria-hidden="true">
      <div className="firehouse-card__head">
        <span className="map-tooltip__metric">Firehouse</span>
        <span className="map-tooltip__title">{details.address}</span>
        <span className="map-tooltip__subtitle">{details.place}</span>
      </div>
      {details.note && (
        <p className="firehouse-card__note">
          <svg className="firehouse-card__note-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7.2v4" strokeLinecap="round" />
            <circle cx="8" cy="4.9" r="0.4" fill="currentColor" />
          </svg>
          <span>{details.note}</span>
        </p>
      )}
      {details.groups.map((g) => (
        <div key={g.label} className="firehouse-card__group">
          <span className="firehouse-card__label">{g.label}</span>
          <div className="firehouse-card__units">
            {g.units.map((u) => {
              const chip = unitChip(u.kind, palette, color)
              return (
                <span
                  key={u.label}
                  className={`firehouse-card__unit${chip ? ' firehouse-card__unit--company' : ''}`}
                  style={chip ? { background: chip.background, color: chip.ink } : undefined}
                >
                  {u.label}
                </span>
              )
            })}
          </div>
        </div>
      ))}
      {details.area && <div className="map-tooltip__hint">{details.area}</div>}
    </div>
  )
}
