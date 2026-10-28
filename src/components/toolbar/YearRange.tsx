import { useId, type ReactNode } from 'react'
import { FINAL_YEAR, YEARS } from '../../domain/stories'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { yearToOptions } from '../../explorer/state'
import './YearRange.css'

export function YearRange() {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const fromId = useId()
  const toId = useId()

  return (
    <div className="year-range" role="group" aria-label="Years">
      <label htmlFor={fromId}>From</label>
      <Select>
        <select id={fromId} value={state.yearFrom} onChange={(e) => dispatch({ type: 'setYearFrom', year: Number(e.target.value) })}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y === FINAL_YEAR ? `${y}*` : y}
            </option>
          ))}
        </select>
      </Select>
      <label htmlFor={toId}>to</label>
      <Select>
        <select id={toId} value={state.yearTo} onChange={(e) => dispatch({ type: 'setYearTo', year: Number(e.target.value) })}>
          {yearToOptions(state).map((y) => (
            <option key={y} value={y}>
              {y === FINAL_YEAR ? `${y}*` : y}
            </option>
          ))}
        </select>
      </Select>
    </div>
  )
}

/** A select with its own chevron, set in from the edge: the browser's own sits against it. */
function Select({ children }: { children: ReactNode }) {
  return (
    <span className="year-range__select">
      {children}
      <svg className="year-range__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4.5 6 7.5 9 4.5" />
      </svg>
    </span>
  )
}
