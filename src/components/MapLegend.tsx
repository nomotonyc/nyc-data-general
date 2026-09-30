import type { LegendDetails } from '../map/legend'
import './MapLegend.css'

/** Bottom-right of the map, as in the design; wide and short so it covers little. */
export function MapLegend({ details }: { details: LegendDetails }) {
  return (
    <section className="map-legend" aria-label="Map legend">
      <div className="map-legend__title">{details.title}</div>
      <div className="map-legend__scale">
        <span className="map-legend__end">{details.lo}</span>
        <div className="map-legend__steps" aria-hidden="true">
          {details.steps.map((colour) => (
            <span key={colour} className="map-legend__step" style={{ background: colour }} />
          ))}
        </div>
        <span className="map-legend__end">{details.hi}</span>
      </div>
      {details.note && <p className="map-legend__note">{details.note}</p>}
    </section>
  )
}
