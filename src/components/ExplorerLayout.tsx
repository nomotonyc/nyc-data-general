import type { CSSProperties, ReactNode } from 'react'
import './ExplorerLayout.css'

type Props = {
  /** The current story's accent, exposed to all descendants as --story-accent. */
  accent: string
  toolbar: ReactNode
  rail: ReactNode
  map: ReactNode
  panel: ReactNode
}

/** Fills the window with no page scroll; below 1100px the columns stack and the page scrolls. */
export function ExplorerLayout({ accent, toolbar, rail, map, panel }: Props) {
  return (
    <div className="explorer" style={{ '--story-accent': accent } as CSSProperties}>
      <header className="explorer__toolbar">{toolbar}</header>
      <div className="explorer__body">
        <aside className="explorer__rail" aria-label="Map controls">
          {rail}
        </aside>
        <main className="explorer__map">{map}</main>
        <aside className="explorer__panel" aria-label="In focus">
          {panel}
        </aside>
      </div>
    </div>
  )
}
