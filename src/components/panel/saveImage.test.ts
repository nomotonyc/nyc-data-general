import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveImage } from './saveImage'

vi.mock('html-to-image', () => ({ toJpeg: vi.fn(async () => 'data:image/jpeg;base64,/9j/') }))
const { toJpeg } = await import('html-to-image')

/** A phone (a coarse pointer) or a laptop, and whether it can share files. */
function device({ phone, share }: { phone: boolean; share?: (data: ShareData) => Promise<void> }) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: phone && q === '(pointer: coarse)' }))
  Object.assign(navigator, { canShare: share ? () => true : undefined, share })
}

describe('saveImage', () => {
  const node = document.createElement('div')
  let clicked: HTMLAnchorElement[]
  beforeEach(() => {
    clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Object.assign(navigator, { canShare: undefined, share: undefined })
  })

  it('draws the node as a JPEG on the page’s background, sharp on any screen, leaving out what is marked to skip', async () => {
    device({ phone: false })
    await saveImage(node, { name: 'trend', background: '#ffffff' })
    const options = vi.mocked(toJpeg).mock.calls.at(-1)![1]!
    expect(options).toMatchObject({ backgroundColor: '#ffffff', pixelRatio: 2 })
    const skipped = document.createElement('button')
    skipped.dataset.export = 'skip'
    expect(options.filter!(skipped)).toBe(false)
    expect(options.filter!(document.createElement('span'))).toBe(true)
  })

  it('carries what styles a chart’s lines and labels into the picture, then puts them back', async () => {
    // html-to-image copies an <svg> whole, without the styles its stylesheet gives what's inside.
    device({ phone: false })
    const css = document.createElement('style')
    css.textContent = '.tick { fill: rgb(1, 2, 3); font-size: 11px }'
    document.head.append(css)
    const chart = document.createElement('div')
    chart.innerHTML = '<svg><text class="tick" style="opacity: 1">Jan</text></svg>'
    document.body.append(chart)
    const text = chart.querySelector('text')!
    let during = ''
    vi.mocked(toJpeg).mockImplementationOnce(async () => {
      during = text.getAttribute('style') ?? ''
      return 'data:image/jpeg;base64,/9j/'
    })
    await saveImage(chart, { name: 'trend', background: '#fff' })
    expect(during).toMatch(/fill: rgb\(1, 2, 3\)/)
    expect(during).toMatch(/font-size: 11px/)
    expect(text.getAttribute('style')).toBe('opacity: 1')
    css.remove()
    chart.remove()
  })

  it('takes the whole node, not just what shows of it when it scrolls, and no scrollbar', async () => {
    device({ phone: false })
    const tall = document.createElement('div')
    vi.spyOn(tall, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(tall, 'scrollWidth', 'get').mockReturnValue(300)
    await saveImage(tall, { name: 'trend', background: '#fff' })
    expect(vi.mocked(toJpeg).mock.calls.at(-1)![1]).toMatchObject({ width: 300, height: 900, style: { maxHeight: 'none', height: '900px', overflow: 'visible' } })
  })

  it('downloads it on a laptop', async () => {
    device({ phone: false, share: vi.fn() })
    await saveImage(node, { name: 'structural-fires-queens-2025', background: '#fff' })
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('structural-fires-queens-2025.jpg')
    expect(clicked[0].href).toMatch(/^data:image\/jpeg/)
    expect(navigator.share).not.toHaveBeenCalled()
  })

  it('offers it to the share sheet on a phone, where Save Image puts it in the photos', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
    device({ phone: true, share })
    await saveImage(node, { name: 'trend', background: '#fff' })
    const file = share.mock.calls[0][0].files![0]
    expect(file).toMatchObject({ name: 'trend.jpg', type: 'image/jpeg' })
    expect(clicked).toHaveLength(0)
  })

  it('does nothing more when the share sheet is dismissed', async () => {
    device({ phone: true, share: vi.fn(async () => Promise.reject(new DOMException('cancelled', 'AbortError'))) })
    await saveImage(node, { name: 'trend', background: '#fff' })
    expect(clicked).toHaveLength(0)
  })

  it('asks for another tap when the phone needs one to open the share sheet, then shares the same picture', async () => {
    // A slow drawing can outlast the tap's permission to open the sheet.
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValueOnce(new DOMException('no', 'NotAllowedError')).mockResolvedValueOnce(undefined)
    device({ phone: true, share })
    const saved = await saveImage(node, { name: 'trend', background: '#fff' })
    if (saved === 'done') throw new Error('expected a second tap')
    expect(await saved.tapToSave()).toBe('done')
    expect(share).toHaveBeenCalledTimes(2)
    expect(share.mock.calls[1][0].files![0].name).toBe('trend.jpg')
    expect(clicked).toHaveLength(0)
  })

  it('downloads when the second tap can’t share either, rather than asking forever', async () => {
    device({ phone: true, share: vi.fn(async () => Promise.reject(new DOMException('no', 'NotAllowedError'))) })
    const saved = await saveImage(node, { name: 'trend', background: '#fff' })
    if (saved === 'done') throw new Error('expected a second tap')
    expect(await saved.tapToSave()).toBe('done')
    expect(clicked).toHaveLength(1)
  })

  it('downloads instead on a phone that can’t share files, or where sharing fails', async () => {
    device({ phone: true })
    expect(await saveImage(node, { name: 'trend', background: '#fff' })).toBe('done')
    device({ phone: true, share: vi.fn(async () => Promise.reject(new TypeError('bad file'))) })
    expect(await saveImage(node, { name: 'trend', background: '#fff' })).toBe('done')
    expect(clicked).toHaveLength(2)
  })
})
