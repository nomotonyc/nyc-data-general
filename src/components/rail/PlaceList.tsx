import { useId, useMemo } from 'react'
import { placeValues } from '../../data/places'
import { formatCompact, formatCount } from '../../domain/format'
import { BOROUGHS, type Borough } from '../../domain/geography'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { activeMetric } from '../../explorer/state'
import { equalIntervalScale } from '../../map/colorScale'
import { useTheme } from '../../theme/context'

type Row = { borough: Borough | null; label: string; value: number; swatch: string }

export function PlaceList() {
  const headingId = useId()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const ds = useDataset()
  const theme = useTheme()

  const metric = activeMetric(state)
  // Not on every render: toggles and focus changes don't alter the values.
  const values = useMemo(
    () => placeValues(ds, metric, { from: state.yearFrom, to: state.yearTo }),
    [ds, metric, state.yearFrom, state.yearTo],
  )
  const colour = equalIntervalScale(BOROUGHS.map((b) => values.boroughs[b]), theme.story[state.storyId].ramp)
  const rows: Row[] = [
    { borough: null, label: 'All of New York City', value: values.city, swatch: theme.story[state.storyId].accent },
    ...BOROUGHS.map((b) => ({ borough: b, label: b, value: values.boroughs[b], swatch: colour(values.boroughs[b]) })),
  ]

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Where
      </h2>
      {rows.map((row) => (
        <button
          key={row.label}
          type="button"
          className="rail__option"
          aria-pressed={state.borough === row.borough}
          onClick={() => dispatch({ type: 'focusBorough', borough: row.borough })}
        >
          <span className="rail__swatch" style={{ background: row.swatch }} aria-hidden="true" />
          <span className="rail__label">{row.label}</span>
          <span className="rail__value" title={formatCount(row.value)}>
            {formatCompact(row.value)}
          </span>
        </button>
      ))}
    </section>
  )
}
