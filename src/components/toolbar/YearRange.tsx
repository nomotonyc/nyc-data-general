import { useId } from 'react'
import { YEARS, yearLabel } from '../../domain/stories'
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
      <select
        id={fromId}
        value={state.yearFrom}
        onChange={(e) => dispatch({ type: 'setYearFrom', year: Number(e.target.value) })}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {yearLabel(y)}
          </option>
        ))}
      </select>
      <label htmlFor={toId}>to</label>
      <select
        id={toId}
        value={state.yearTo}
        onChange={(e) => dispatch({ type: 'setYearTo', year: Number(e.target.value) })}
      >
        {yearToOptions(state).map((y) => (
          <option key={y} value={y}>
            {yearLabel(y)}
          </option>
        ))}
      </select>
    </div>
  )
}
