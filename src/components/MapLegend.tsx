import type { LegendDetails } from '../map/legend'
import { SaveImageButton } from './SaveImageButton'
import type { SaveState } from './useSaveImage'
import './MapLegend.css'

type Props = {
  details: LegendDetails
  /** The map's save button (useSaveImage), at the end of the title: none in the map's own picture. */
  save?: { state: SaveState; onClick: () => void }
}

/** Bottom-right of the map, as in the design; wide and short so it covers little. */
export function MapLegend({ details, save }: Props) {
  return (
    <section className="map-legend" aria-label="Map legend">
      <div className="map-legend__head">
        <div className="map-legend__title">{details.title}</div>
        {save && <SaveImageButton {...save} of="Map" />}
      </div>
      <div className="map-legend__scale">
        <span className="map-legend__end">{details.lo}</span>
        <div className="map-legend__steps" aria-hidden="true">
          {details.steps.map((colour, i) => (
            <span key={i} className="map-legend__step" style={{ background: colour }} />
          ))}
        </div>
        <span className="map-legend__end">{details.hi}</span>
      </div>
      {details.note && <p className="map-legend__note">{details.note}</p>}
    </section>
  )
}
