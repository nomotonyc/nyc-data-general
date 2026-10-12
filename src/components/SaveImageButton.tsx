import type { MouseEventHandler } from 'react'
import type { SaveState } from './useSaveImage'
import './SaveImageButton.css'

type Props = {
  /** useSaveImage's `button`. */
  state: SaveState
  onClick: MouseEventHandler<HTMLButtonElement>
  /** The label beside the icon, as in the trend dialog; otherwise the icon alone, named by it. */
  labelled?: boolean
  /** What it saves, where there are several: "Save image: How the boroughs compare". */
  of?: string
}

/**
 * Saves a picture. Never disabled while saving, which would drop focus out of a dialog; it ignores
 * presses instead (useSaveImage). An icon-only button shows its words once it isn't idle, since
 * "Tap to save" and "Couldn't save" ask for something. Left out of the pictures it takes.
 */
export function SaveImageButton({ state, onClick, labelled = false, of }: Props) {
  const name = of ? `${state.label}: ${of}` : state.label
  return (
    <button
      type="button"
      className={['save-image', (labelled || !state.idle) && 'save-image--labelled', state.idle && 'save-image--idle'].filter(Boolean).join(' ')}
      data-export="skip"
      aria-label={name}
      aria-disabled={state.saving}
      title={labelled ? undefined : name}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
      </svg>
      {(labelled || !state.idle) && <span className="save-image__label">{state.label}</span>}
    </button>
  )
}
