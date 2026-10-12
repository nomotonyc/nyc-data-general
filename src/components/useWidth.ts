import { useLayoutEffect, useState } from 'react'

/**
 * An element's width in pixels, kept current as it resizes; `fallback` until it's measured, or
 * where it can't be (no layout, as in tests). Pass the returned ref to the element: it measures
 * whenever the element attaches, before the browser paints.
 */
export function useWidth(fallback: number): [(el: HTMLElement | null) => void, number] {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => setWidth(el.clientWidth || fallback)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, fallback])
  return [setEl, width]
}
