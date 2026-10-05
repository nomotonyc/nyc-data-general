import { useLayoutEffect, useRef } from 'react'
import { tooltipPosition } from '../map/hover'

/**
 * Places a card beside the pointer from its real rendered size (cards differ in height),
 * before the browser paints, so it never shows cut off or in the wrong spot.
 */
export function useCardPosition(pointer: { x: number; y: number }, area: { width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const card = ref.current
    if (!card) return
    const { left, top } = tooltipPosition(pointer, { width: card.offsetWidth, height: card.offsetHeight }, area)
    card.style.left = `${left}px`
    card.style.top = `${top}px`
  })
  return ref
}
