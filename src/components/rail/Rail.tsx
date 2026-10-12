import { AreaSwitch } from './AreaSwitch'
import { DetailToggle } from './DetailToggle'
import { LayerPicker } from './LayerPicker'
import { MapToggles } from './MapToggles'
import { PlaceList } from './PlaceList'
import './Rail.css'

/** The map's controls. `places` leaves out the Where list, for phones, where the panel's borough bars do its job. */
export function Rail({ places = true }: { places?: boolean }) {
  return (
    <div className="rail">
      {places && <PlaceList />}
      <AreaSwitch />
      <DetailToggle />
      <LayerPicker />
      <MapToggles />
    </div>
  )
}
