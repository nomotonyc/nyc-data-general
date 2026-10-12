import { toJpeg } from 'html-to-image'

/** Saved, or needing another tap: on a phone, a slow drawing can outlast the tap's permission to share. */
export type Saved = 'done' | { tapToSave: () => Promise<Saved> }

/**
 * Saves a node as a JPEG, all of it however it scrolls, drawn at twice its size so it's sharp on
 * any screen, leaving out anything marked `data-export="skip"` (its own buttons). A laptop downloads
 * it. A phone offers it to the share sheet, whose Save Image puts it in the photos: a page can't
 * write there itself. A phone that can't share files, or where sharing fails, downloads it too.
 */
export async function saveImage(node: HTMLElement, { name, background }: { name: string; background: string }): Promise<Saved> {
  const restore = inlineSvgStyles(node)
  let url: string
  try {
    // All of it, as if it didn't scroll: a modal taller than a phone's screen scrolls.
    const width = node.scrollWidth
    const height = node.scrollHeight
    url = await toJpeg(node, {
      width,
      height,
      style: { maxHeight: 'none', height: `${height}px`, overflow: 'visible' },
      backgroundColor: background,
      pixelRatio: 2,
      quality: 0.92,
      filter: (el) => !(el instanceof HTMLElement && el.dataset.export === 'skip'),
    })
  } finally {
    restore()
  }
  return deliver(url, `${name}.jpg`, false)
}

/**
 * To the share sheet on a phone, else a download. A sheet that refuses for want of a tap gets one
 * more go, on the next tap, with the same picture; after that it downloads.
 */
async function deliver(url: string, file: string, retried: boolean): Promise<Saved> {
  if (window.matchMedia?.('(pointer: coarse)').matches) {
    const files = [new File([bytes(url)], file, { type: 'image/jpeg' })]
    if (navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files })
        return 'done'
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'done' // the sheet was dismissed
        if (e instanceof DOMException && e.name === 'NotAllowedError' && !retried) return { tapToSave: () => deliver(url, file, true) }
      }
    }
  }
  const link = document.createElement('a')
  link.href = url
  link.download = file
  link.click()
  return 'done'
}

/** What draws an SVG's lines and labels. */
const SVG_STYLE = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'font-weight'] as const

/**
 * html-to-image copies an <svg> whole, so what's inside it loses the styles the stylesheet gives
 * it (a chart's gridlines and labels). Writes them onto each element for the capture, and returns
 * what puts the elements back as they were. The values are the ones already shown: nothing moves.
 */
function inlineSvgStyles(node: HTMLElement): () => void {
  const saved = [...node.querySelectorAll<SVGElement>('svg *')].map((el) => {
    const before = el.getAttribute('style')
    const computed = getComputedStyle(el)
    for (const prop of SVG_STYLE) el.style.setProperty(prop, computed.getPropertyValue(prop))
    return { el, before }
  })
  return () => {
    for (const { el, before } of saved) {
      if (before === null) el.removeAttribute('style')
      else el.setAttribute('style', before)
    }
  }
}

/** The bytes of a base64 data URL. */
function bytes(url: string): Uint8Array<ArrayBuffer> {
  const text = atob(url.slice(url.indexOf(',') + 1))
  return Uint8Array.from(text, (c) => c.charCodeAt(0))
}
