import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

/** What Tab moves between inside a modal. */
const FOCUSABLE = 'button:not([tabindex="-1"]), input, [tabindex="0"]'

/** Keeps Tab inside a modal: on from its last control to its first, and back. */
export function trapTab(e: KeyboardEvent, modal: HTMLElement | null) {
  if (e.key !== 'Tab' || !modal) return
  const items = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = items[0]
  const end = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    end.focus()
  } else if (!e.shiftKey && document.activeElement === end) {
    e.preventDefault()
    first.focus()
  }
}

/**
 * Escape calls onClose while mounted, or not at all without one. Always the latest onClose, so
 * a new one each render costs nothing.
 */
export function useEscape(onClose: (() => void) | undefined) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  const listening = onClose !== undefined
  useEffect(() => {
    if (!listening) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') latest.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [listening])
}

/**
 * A card opened by a tap: it takes focus when it opens, so a screen reader reads it, without
 * scrolling the page; Escape closes it. A card that follows the pointer does neither.
 */
export function useSheet(ref: RefObject<HTMLElement | null>, onClose: (() => void) | undefined) {
  const sheet = onClose !== undefined
  useEffect(() => {
    if (sheet) ref.current?.focus({ preventScroll: true })
  }, [ref, sheet])
  useEscape(onClose)
}
