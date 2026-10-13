import { useId, useRef, useState, type ReactNode } from 'react'
import { useDataset, useExplorerState } from '../../explorer/context'
import { pictureCaption, pictureView, slug, type PictureOf } from '../../panel/caption'
import { useTheme } from '../../theme/context'
import { SaveImageButton } from '../SaveImageButton'
import { useSaveImage } from '../useSaveImage'
import '../Picture.css'

type Props = {
  /** The section's heading, which names its picture too. */
  title: string
  /** What the section shows, which its picture's caption says (pictureCaption). */
  of: PictureOf
  /** The "In focus" kicker of the summary, rather than a section title. */
  kicker?: boolean
  children: ReactNode
}

/**
 * A panel section that saves itself as a picture. On its own a section doesn't say what it shows
 * or whose data it is, so its picture carries them above and below. The picture is laid out off
 * the screen, at the section's width, so nothing on screen moves while it's taken.
 */
export function SaveableSection({ title, of, kicker = false, children }: Props) {
  const headingId = useId()
  const ref = useRef<HTMLElement>(null)
  const pictureRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const state = useExplorerState()
  const ds = useDataset()
  const picture = useSaveImage(useTheme().color.background, pictureView(state))
  const caption = picture.saving ? pictureCaption(of, state, ds) : null

  const heading = (id?: string) =>
    kicker ? (
      <div id={id} className="panel__kicker">
        {title}
      </div>
    ) : (
      <h3 id={id} className="panel__title">
        {title}
      </h3>
    )
  const save = () => {
    setWidth(ref.current?.clientWidth ?? 0) // laid out with the press, as saving starts
    picture.save(() => pictureRef.current && { node: pictureRef.current, name: `${slug(title)}-${pictureCaption(of, state, ds).name}` })
  }

  return (
    <section ref={ref} className="panel__section" aria-labelledby={headingId}>
      <div className="panel__head">
        {heading(headingId)}
        <SaveImageButton state={picture.button} onClick={save} of={title} />
      </div>
      {children}
      {caption && (
        <div className="picture-stage" inert>
          <div ref={pictureRef} className="picture" style={{ width }}>
            <p className="picture__title">{caption.title}</p>
            <div className="panel__section">
              <div className="panel__head">{heading()}</div>
              {children}
            </div>
            <p className="picture__credit">{caption.credit}</p>
          </div>
        </div>
      )}
    </section>
  )
}
