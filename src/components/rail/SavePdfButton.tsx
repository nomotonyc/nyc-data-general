/** Opens the browser's print dialog, where the current explorer view can be saved as a PDF. */
export function SavePdfButton() {
  return (
    <div className="rail__actions">
      <button type="button" className="rail__save" onClick={() => window.print()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 15v5h14v-5" />
        </svg>
        Save as PDF
      </button>
      <p className="rail__save-note">Exports the current map and data view.</p>
    </div>
  )
}
