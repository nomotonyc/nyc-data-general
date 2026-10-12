import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PHONE_LAYOUT } from '../map/config'
import { MapSettings } from './MapSettings'
import { useMediaQuery } from './useMediaQuery'
import './ExplorerLayout.css'

type Props = {
  /** The current story's accent, exposed to all descendants as --story-accent. */
  accent: string
  toolbar: ReactNode
  rail: ReactNode
  /** On a phone, in place of the rail: its controls, behind a button on the map. */
  settings: ReactNode
  map: ReactNode
  panel: ReactNode
}

/**
 * Fills the window with no page scroll; below 1100px the columns stack, map first, and the page
 * scrolls. On a phone the page is the map and the panel; the rail's controls open from the map.
 */
export function ExplorerLayout({ accent, toolbar, rail, settings, map, panel }: Props) {
  // Rendered in one place or the other, never both: the rail's radio group is named.
  const phone = useMediaQuery(PHONE_LAYOUT)

  // Crossing the phone width (a phone turning) takes away the rail or the settings sheet. Focus
  // in what went is lost to the page, so it moves to what now holds those controls. What had
  // focus is read while rendering the change, before it commits and the element leaves the page
  // (focus events can't say: a browser doesn't send them while its window is in the background).
  const root = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLElement>(null)
  const [crossing, setCrossing] = useState<{ phone: boolean; focused: Element | null }>({ phone, focused: null })
  if (crossing.phone !== phone) setCrossing({ phone, focused: document.activeElement })
  useEffect(() => {
    const was = crossing.focused
    // Until the browser tidies up, activeElement may still be the removed element.
    const active = document.activeElement
    const lost = was && was !== document.body && !was.isConnected && (!active || active === document.body || !active.isConnected)
    if (!lost) return
    const next = crossing.phone ? root.current?.querySelector<HTMLElement>('.map-settings__open') : railRef.current
    next?.focus()
  }, [crossing])

  return (
    <div ref={root} className="explorer" style={{ '--story-accent': accent } as CSSProperties}>
      <header className="explorer__toolbar">{toolbar}</header>
      <div className="explorer__body">
        {!phone && (
          <aside ref={railRef} className="explorer__rail" aria-label="Map controls" tabIndex={-1}>
            {rail}
          </aside>
        )}
        <main className="explorer__map">
          {map}
          {phone && <MapSettings>{settings}</MapSettings>}
        </main>
        <aside className="explorer__panel" aria-label="In focus">
          {panel}
        </aside>
      </div>
    </div>
  )
}
