/** Closes a card opened by a tap. */
export function CardClose({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="map-tooltip__close" aria-label="Close" onClick={onClose}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  )
}
