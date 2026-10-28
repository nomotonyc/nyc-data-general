import { useId } from 'react'
import { areaNoun } from '../../domain/geography'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'

export function MapToggles() {
  const headingId = useId()
  const { showOutlines, showLabels, showHospitals, showEmsStations, showFirehouses, showHydrants, geography, storyId } = useExplorerState()
  const noun = areaNoun(geography)
  const dispatch = useExplorerDispatch()

  return (
    <section className="rail__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="rail__heading">
        Show on map
      </h2>
      <label className="rail__check">
        <input type="checkbox" checked={showOutlines} onChange={() => dispatch({ type: 'toggleOutlines' })} />
        {noun.one.charAt(0).toUpperCase() + noun.one.slice(1)} outlines
      </label>
      <label className="rail__check">
        <input type="checkbox" checked={showLabels} onChange={() => dispatch({ type: 'toggleLabels' })} />
        Place labels
      </label>
      <label className="rail__check">
        <input type="checkbox" checked={showHospitals} onChange={() => dispatch({ type: 'toggleHospitals' })} />
        Hospitals
      </label>
      <label className="rail__check">
        <input type="checkbox" checked={showEmsStations} onChange={() => dispatch({ type: 'toggleEmsStations' })} />
        EMS stations
      </label>
      {showEmsStations && (
        <ul className="rail__key" aria-label="EMS station markers">
          <li>
            <svg className="rail__ems-marker" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 5.2 15 14.2H5Z" />
            </svg>
            EMS station
          </li>
          <li>
            <svg className="rail__ems-marker" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3.52 16.75 15.67H3.25Z" />
            </svg>
            EMS station at hospital
          </li>
        </ul>
      )}
      <label className="rail__check">
        <input type="checkbox" checked={showFirehouses} onChange={() => dispatch({ type: 'toggleFirehouses' })} />
        Firehouses
      </label>
      {showFirehouses && (
        // The map's markers, drawn as there: one step per rank of command housed (layers.ts).
        <ul className="rail__key" aria-label="Firehouse markers">
          <li>
            <svg className="rail__marker" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="3.5" strokeWidth="1.4" />
            </svg>
            Firehouse
          </li>
          <li>
            <svg className="rail__marker" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="5" strokeWidth="2.6" />
            </svg>
            Battalion HQ
          </li>
          <li>
            <svg className="rail__marker rail__marker--filled" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="5" strokeWidth="1.6" />
            </svg>
            Division HQ
          </li>
          <li>
            <svg className="rail__marker rail__marker--filled" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle className="rail__marker-outer" cx="10" cy="10" r="8.6" strokeWidth="1.4" />
              <circle cx="10" cy="10" r="5" strokeWidth="1.6" />
            </svg>
            Borough command HQ
          </li>
        </ul>
      )}
      {storyId === 'fire' && <label className="rail__check">
        <input type="checkbox" checked={showHydrants} onChange={() => dispatch({ type: 'toggleHydrants' })} />
        Hydrants
      </label>}
    </section>
  )
}
