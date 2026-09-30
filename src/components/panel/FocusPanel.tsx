import { BoroughBars } from './BoroughBars'
import { FocusSummary } from './FocusSummary'
import './Panel.css'
import { Sources } from './Sources'
import { TopPrecincts } from './TopPrecincts'

/** The right-hand panel, as in the design. */
export function FocusPanel() {
  return (
    <div className="panel">
      <FocusSummary />
      <BoroughBars />
      <TopPrecincts />
      <Sources />
    </div>
  )
}
