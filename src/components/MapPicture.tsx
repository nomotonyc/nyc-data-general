import type { LegendDetails } from '../map/legend'
import { MapLegend } from './MapLegend'
import type { Shot } from './mapShot'
import './Picture.css'

/** The map in a picture: its pixels, with its legend under them, whatever the layout on screen. */
export function MapPicture({ shot, legend }: { shot: Shot; legend: LegendDetails }) {
  return (
    <div className="map-picture">
      <img src={shot.url} width={shot.width} height={shot.height} alt="" />
      <MapLegend details={legend} />
    </div>
  )
}
