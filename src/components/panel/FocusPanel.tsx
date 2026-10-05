import { BoroughBars } from './BoroughBars'
import { Breakdown } from './Breakdown'
import { Firehouses } from './Firehouses'
import { FocusSummary } from './FocusSummary'
import './Panel.css'
import { Sources } from './Sources'
import { TopAreas } from './TopAreas'
import { Trend } from './Trend'

/** The right-hand panel, as in the design. */
export function FocusPanel() {
  return (
    <div className="panel">
      <FocusSummary />
      <BoroughBars />
      <Trend />
      <Breakdown />
      <TopAreas />
      <Firehouses />
      <Sources />
    </div>
  )
}
