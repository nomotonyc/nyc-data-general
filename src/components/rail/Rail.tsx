import { AreaSwitch } from './AreaSwitch'
import { DetailToggle } from './DetailToggle'
import { LayerPicker } from './LayerPicker'
import { MapToggles } from './MapToggles'
import { PlaceList } from './PlaceList'
import './Rail.css'

export function Rail() {
  return (
    <div className="rail">
      <PlaceList />
      <AreaSwitch />
      <DetailToggle />
      <LayerPicker />
      <MapToggles />
    </div>
  )
}
