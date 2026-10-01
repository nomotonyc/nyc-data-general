import { useEffect, useState, type ReactNode } from 'react'
import { datasets as appDatasets, type DatasetStore } from '../../data/load'
import './DataGate.css'

type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'failed'; message: string }

/** Loads every built layer before showing the app; says so while loading, and names what failed. */
export function DataGate({ children, store = appDatasets }: { children: ReactNode; store?: DatasetStore }) {
  const [status, setStatus] = useState<Status>(() => (store.ready() ? { kind: 'ready' } : { kind: 'loading' }))

  useEffect(() => {
    if (status.kind !== 'loading') return
    let current = true
    store.load().then(
      () => current && setStatus({ kind: 'ready' }),
      (e: Error) => current && setStatus({ kind: 'failed', message: e.message }),
    )
    return () => {
      current = false
    }
  }, [status.kind, store])

  if (status.kind === 'ready') return children
  return (
    <div className="data-gate">
      {status.kind === 'loading' ? (
        <p role="status">Loading data…</p>
      ) : (
        <div role="alert" className="data-gate__error">
          <p>{status.message}. Check your connection and try again.</p>
          <button type="button" onClick={() => setStatus({ kind: 'loading' })}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
