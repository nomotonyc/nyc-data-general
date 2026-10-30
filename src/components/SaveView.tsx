import { useContext, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { useDataset, useExplorerState } from '../explorer/context'
import { PHONE_LAYOUT } from '../map/config'
import { pictureCaption, pictureView } from '../panel/caption'
import { chartSize, expandedTrend } from '../panel/expandedTrend'
import { useTheme } from '../theme/context'
import { MapPicture } from './MapPicture'
import { MapShotContext, type MapShot } from './mapShot'
import { BoroughBars } from './panel/BoroughBars'
import { Breakdown } from './panel/Breakdown'
import { Firehouses } from './panel/Firehouses'
import { FocusSummary } from './panel/FocusSummary'
import { TopAreas } from './panel/TopAreas'
import { Trend } from './panel/Trend'
import { TrendChart, TrendReadout } from './panel/TrendChart'
import { SaveImageButton } from './SaveImageButton'
import { useMediaQuery } from './useMediaQuery'
import { useSaveImage } from './useSaveImage'
import './panel/Panel.css'
import './Picture.css'

/** The least height the map is drawn at, however little the details beside it. */
export const MIN_MAP_HEIGHT = 640

/** The picture's layout, set here and handed to its stylesheet (Picture.css) as custom properties. */
const LEFT_COLUMN = 300 // focus and borough comparison
const RIGHT_COLUMN = 360 // building type, battalions and trend
const GAP = 32 // between each column and the map
const BRAND_IMAGE = `${import.meta.env.BASE_URL}nyc-brand.png`

/** The saved trend stays with the right-hand detail column. */
export const TREND_WIDTH = RIGHT_COLUMN

/**
 * Saves the whole view as one picture: focus and borough comparison to the left of the map,
 * building type, battalion ranking and trend to its right, with data credits below.
 * The map is drawn as tall as the taller side column, so neither leaves an empty corner
 * and the map has most of the picture.
 * It's laid out off the screen, so it comes out the same however wide the window. Not on a phone,
 * whose screen a picture this wide doesn't suit.
 */
export function SaveView() {
  const phone = useMediaQuery(PHONE_LAYOUT)
  const shooter = useContext(MapShotContext)
  const state = useExplorerState()
  const ds = useDataset()
  const theme = useTheme()
  const picture = useSaveImage(theme.color.background, pictureView(state), 'Save view')
  const [shot, setShot] = useState<MapShot | null>(null)
  const [mapHeight, setMapHeight] = useState(MIN_MAP_HEIGHT)
  const ref = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  if (phone) return null

  const caption = picture.saving ? pictureCaption('view', state, ds) : null
  const mapFullWidth = shot ? Math.round((mapHeight * shot.width) / shot.height) : 0
  // A citywide map has generous blank edges. Keep more of the shot around focused places.
  const mapInset = Math.min(200, Math.round(mapFullWidth * (state.borough ? 0.05 : 0.15)))
  const mapWidth = mapFullWidth - 2 * mapInset
  const layout = {
    '--view-left-column': `${LEFT_COLUMN}px`, '--view-right-column': `${RIGHT_COLUMN}px`,
    '--view-gap': `${GAP}px`,
    '--view-map-width': `${mapWidth}px`, '--view-map-full-width': `${mapFullWidth}px`,
  } as CSSProperties
  // The saved trend fits the right column, with no period marked; none without a trend.
  const palette = { accent: theme.story[state.storyId].accent, ramp: theme.story[state.storyId].ramp, city: theme.color.trendCity }
  const size = chartSize(TREND_WIDTH)
  const big = caption && expandedTrend(state, ds, palette, null, size)
  const save = async () => {
    const taken: { shot?: MapShot } = {}
    const ran = await picture.save(async () => {
      const shot = (taken.shot = await shooter.take())
      flushSync(() => {
        setShot(shot)
        setMapHeight(MIN_MAP_HEIGHT)
      })
      // The taller sidebar determines the map height; the legend is inset over the map.
      let height = MIN_MAP_HEIGHT
      for (let pass = 0; pass < 3; pass++) {
        const sideHeight = Math.max(leftRef.current?.offsetHeight ?? 0, rightRef.current?.offsetHeight ?? 0)
        const fits = Math.max(MIN_MAP_HEIGHT, sideHeight)
        if (fits === height) break
        height = fits
        flushSync(() => setMapHeight(fits))
      }
      await Promise.all([...ref.current?.querySelectorAll('img') ?? []].map((image) => image.decode?.()))
      return ref.current && { node: ref.current, name: `view-${pictureCaption('view', state, ds).name}` }
    })
    // Only a press that saved clears its picture: one made mid-save leaves that save's alone.
    if (ran) {
      setShot(null)
      if (taken.shot) URL.revokeObjectURL(taken.shot.url)
    }
  }

  return (
    <>
      <SaveImageButton state={picture.button} onClick={save} labelled />
      {caption && shot && (
        <div className="picture-stage" inert>
          <div ref={ref} className="picture view-picture" style={layout}>
            <div className="view-picture__header">
              <img className="view-picture__brand" src={BRAND_IMAGE} alt="Nomoto" />
              <p className="picture__title">{caption.title}</p>
            </div>
            <div className="view-picture__body">
              <div ref={leftRef} className="panel view-picture__column view-picture__column--left">
                <FocusSummary />
                <BoroughBars />
              </div>
              <div className="view-picture__map">
                <MapPicture shot={shot} legend={shot.legend} />
              </div>
              <div ref={rightRef} className="panel view-picture__column view-picture__column--right">
                <Breakdown />
                <TopAreas />
                <Firehouses />
                {big ? (
                  <section className="panel__section view-picture__trend">
                    <h3 className="panel__title">Trend · {big.place}</h3>
                    <div className="panel__context">{big.sub}</div>
                    <TrendReadout big={big} values={false} />
                    <TrendChart big={big} size={size} marked={false} />
                    {big.note && <div className="panel__context">{big.note}</div>}
                  </section>
                ) : (
                  <div className="panel__section view-picture__trend">
                    <Trend />
                  </div>
                )}
              </div>
            </div>
            <p className="picture__credit">{caption.credit}</p>
          </div>
        </div>
      )}
    </>
  )
}
