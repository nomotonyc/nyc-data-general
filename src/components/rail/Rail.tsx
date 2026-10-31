import { DetailToggle } from './DetailToggle'
import { LayerPicker } from './LayerPicker'
import { MapToggles } from './MapToggles'
import { SavePdfButton } from './SavePdfButton'
import './Rail.css'

/** The map's controls. `places` leaves out the Where list, for phones, where the panel's borough bars do its job. */
export function Rail({ places: _places = true }: { places?: boolean }) {
  return (
    <div className="rail">
      <DetailToggle />
      <LayerPicker />
      <MapToggles />
      <SavePdfButton />
    </div>
  )
}
