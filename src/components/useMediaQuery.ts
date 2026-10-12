import { useCallback, useMemo, useSyncExternalStore } from 'react'

/** Whether the window matches a media query, kept current as it resizes. False where there is no matchMedia. */
export function useMediaQuery(query: string): boolean {
  const list = useMemo(() => window.matchMedia?.(query), [query])
  const subscribe = useCallback(
    (onChange: () => void) => {
      list?.addEventListener('change', onChange)
      return () => list?.removeEventListener('change', onChange)
    },
    [list],
  )
  return useSyncExternalStore(subscribe, () => list?.matches ?? false, () => false)
}
