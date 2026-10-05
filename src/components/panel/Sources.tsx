import type { Placement } from '../../data/dataset'
import { useId } from 'react'
import { METHOD_URL } from '../../domain/stories'
import { useDataset, useExplorerState } from '../../explorer/context'
import { activeMetric } from '../../explorer/state'
import { layerMethod, layerSources } from '../../layers'

const asOfDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const placementText = (placement: readonly Placement[]) =>
  `By battalion: ${placement.map((p) => `${sharePercent(p.share)} placed by ${p.method} (${p.exact ? 'exact' : 'estimated'})`).join('; ')}.`

/** A share as a whole percent; a real but tiny share reads "<1%", never "0%". */
const sharePercent = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

/** Where the active layer's numbers come from, straight from its layer file. Closed until opened. */
export function Sources() {
  const labelId = useId()
  const layer = activeMetric(useExplorerState())
  const ds = useDataset()
  return (
    <section className="panel__section panel__sources" aria-labelledby={labelId}>
      <details>
        <summary className="panel__sources-summary">
          <span id={labelId} className="panel__title">
            Data sources
          </span>
          {ds.isSample && <span className="panel__sample-flag"> · sample values</span>}
        </summary>
        <div className="panel__sources-body">
          {ds.asOf && <p className="panel__as-of">Data as of {asOfDate(ds.asOf)}</p>}
          {ds.geography === 'battalions' && ds.placement && <p className="panel__placement">{placementText(ds.placement)}</p>}
          {ds.isSample && (
            <p className="panel__sample">
              These values are samples, generated to show how the page works. Real data from the sources below is on the way.
            </p>
          )}
          <ul className="panel__source-list">
            {layerSources(layer).map((source) => (
              <li key={source.url + source.name}>
                <a href={source.url}>{source.name}</a>
                <span className="panel__source-meta">
                  {source.publisher} · {source.used}
                </span>
              </li>
            ))}
          </ul>
          <div className="panel__method">
            <div className="panel__method-title">How this is calculated</div>
            <ul>
              {layerMethod(layer).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <a className="panel__full-method" href={METHOD_URL}>
            Full method
          </a>
        </div>
      </details>
    </section>
  )
}
