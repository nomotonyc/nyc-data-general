import { useState } from 'react'
import { flushSync } from 'react-dom'
import { saveImage, type Saved } from './saveImage'

/** What to draw, and the file's name without its extension. */
export type Picture = { node: HTMLElement; name: string }

type Status = 'idle' | 'saving' | 'failed' | Exclude<Saved, 'done'>

const LABEL = { idle: 'Save image', saving: 'Saving…', failed: 'Couldn’t save, try again' } as const

/** useSaveImage's state, for its button. */
export type SaveState = { label: string; saving: boolean; idle: boolean }

/**
 * Saving a picture from a button (saveImage: the share sheet on a phone, else a download).
 * `saving` is already on screen when `picture` runs, so a component can lay out what only the
 * picture shows. A phone's share sheet that needs another tap leaves the button at "Tap to save",
 * which shares the picture already drawn, at once; until `view` (what's on screen) changes, after
 * which that picture is out of date and the button starts again.
 */
export function useSaveImage(background: string, view: string) {
  const [state, setState] = useState<{ status: Status; view: string }>({ status: 'idle', view })
  const set = (status: Status) => setState({ status, view })
  const { status } = state
  if (typeof status === 'object' && state.view !== view) setState({ status: 'idle', view })

  /** Saves the picture; false when a save already under way meant this press did nothing. */
  const save = async (picture: () => Picture | null | Promise<Picture | null>): Promise<boolean> => {
    if (status === 'saving') return false
    // Called before any wait, while the tap still counts: the share sheet needs it.
    const pending = typeof status === 'object' ? status.tapToSave() : null
    flushSync(() => set('saving'))
    const settle = (saved: Saved) => set(saved === 'done' ? 'idle' : saved)
    try {
      if (pending) settle(await pending)
      else {
        const p = await picture()
        if (p) settle(await saveImage(p.node, { name: p.name, background }))
        else set('idle')
      }
    } catch {
      set('failed')
    }
    return true
  }

  const button: SaveState = {
    label: typeof status === 'object' ? 'Tap to save' : LABEL[status],
    saving: status === 'saving',
    idle: status === 'idle',
  }
  return { save, saving: button.saving, button }
}
