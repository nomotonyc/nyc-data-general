import { areaById } from '../../domain/geography'
import { useDataset, useExplorerDispatch, useExplorerState } from '../../explorer/context'
import './Breadcrumb.css'

type Crumb = { label: string; go: () => void }

const BRAND_IMAGE = `${import.meta.env.BASE_URL}nyc-brand.png`

function CityBrand() {
  return (
    <>
      <img className="breadcrumb__brand-image" src={BRAND_IMAGE} alt="" aria-hidden="true" />
      <span className="visually-hidden">New York City</span>
    </>
  )
}

export function Breadcrumb() {
  const { borough, pinnedArea } = useExplorerState()
  const dispatch = useExplorerDispatch()
  const ds = useDataset()

  const crumbs: Crumb[] = [{ label: 'New York City', go: () => dispatch({ type: 'resetCityView' }) }]
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
            {i === crumbs.length - 1 && i !== 0 ? (
              <span className={`breadcrumb__current${i === 0 ? ' breadcrumb__brand' : ''}`} aria-current="location">
                {i === 0 ? <CityBrand /> : crumb.label}
              </span>
            ) : (
              <button type="button" aria-current={i === 0 && crumbs.length === 1 ? 'location' : undefined} onClick={crumb.go} className={i === 0 ? 'breadcrumb__brand' : undefined}>
                {i === 0 ? <CityBrand /> : crumb.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
