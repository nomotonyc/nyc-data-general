import { DetailToggle } from './DetailToggle'
import { LayerPicker } from './LayerPicker'
import { MapToggles } from './MapToggles'
import { PlaceList } from './PlaceList'
import './Rail.css'

export function Rail() {
  return (
    <div className="rail">
      <PlaceList />
      <DetailToggle />
      <LayerPicker />
      <MapToggles />
    </div>
  )
}
