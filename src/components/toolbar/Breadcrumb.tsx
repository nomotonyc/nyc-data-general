import { areaById } from '../../domain/geography'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import './Breadcrumb.css'

type Crumb = { label: string; go: () => void }

export function Breadcrumb() {
  const { borough, pinnedArea } = useExplorerState()
  const dispatch = useExplorerDispatch()
  const ds = useDataset()

  const crumbs: Crumb[] = [{ label: 'New York City', go: () => dispatch({ type: 'focusBorough', borough: null }) }]
  if (borough) crumbs.push({ label: borough, go: () => dispatch({ type: 'unpinArea' }) })
  if (pinnedArea !== null) crumbs.push({ label: areaById(ds.areas, pinnedArea).label, go: () => {} })

  return (
    <nav className="breadcrumb" aria-label="Geography">
      <ol>
        {crumbs.map((crumb, i) => (
          <li key={crumb.label}>
            {i > 0 && (
              <span className="breadcrumb__separator" aria-hidden="true">
                /
              </span>
            )}
            {i === crumbs.length - 1 ? (
              <span className="breadcrumb__current" aria-current="location">
                {crumb.label}
              </span>
            ) : (
              <button type="button" onClick={crumb.go}>
                {crumb.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
