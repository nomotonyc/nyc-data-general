import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { trapTab, useEscape } from './dialog'
import './MapControl.css'
import './MapSettings.css'

/**
 * On a phone, the rail's controls: a button on the map opens them in a sheet from the bottom.
 * It stays open while settings change, so several can be changed at once; Done, Escape or the
 * backdrop close it.
 */
export function MapSettings({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      {/* "Settings" on the button, so it fits beside the back button on the narrowest phones. */}
      <button ref={openRef} type="button" className="map-control map-settings__open" aria-label="Map settings" onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M2 4h7M13 4h1M2 12h1M7 12h7" />
          <circle cx="11" cy="4" r="2" />
          <circle cx="5" cy="12" r="2" />
        </svg>
        Settings
      </button>
      {open && (
        <Sheet
          onClose={() => {
            setOpen(false)
            openRef.current?.focus()
          }}
        >
          {children}
        </Sheet>
      )}
    </>
  )
}

function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  // Focus moves in once, on open; the settings re-render the sheet as they change.
  useEffect(() => {
    doneRef.current?.focus()
  }, [])
  useEscape(onClose)

  // In place, not portalled to the body, so it keeps the story's colour (--story-accent).
  return (
    <div className="map-settings">
      <div className="map-settings__backdrop" data-testid="map-settings-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className="map-settings__sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => trapTab(e, sheetRef.current)}>
        <div className="map-settings__head">
          <h2 id={titleId} className="map-settings__title">
            Map settings
          </h2>
          <button ref={doneRef} type="button" className="map-settings__done" onClick={onClose}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
