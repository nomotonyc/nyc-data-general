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
const COLUMN = 300 // a detail column: the panel's width
const GAP = 32 // between columns, and between the details and the map
const LEGEND_GAP = 12 // between the map and its legend

/** The trend runs across both detail columns. */
export const TREND_WIDTH = 2 * COLUMN + GAP

/**
 * Saves the whole view as one picture: what it shows above; the panel's findings in two columns
 * (each as wide as the panel) with the trend across both, and the map and its legend beside them;
 * whose data below. The map is drawn as tall as the details, so neither leaves an empty corner
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
  const detailsRef = useRef<HTMLDivElement>(null)
  if (phone) return null

  const caption = picture.saving ? pictureCaption('view', state, ds) : null
  const layout = { '--view-column': `${COLUMN}px`, '--view-gap': `${GAP}px`, '--view-legend-gap': `${LEGEND_GAP}px` } as CSSProperties
  // The larger trend's chart, at the width of both columns, with no period marked; none without a trend.
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
      // Laid out once, the details give the height; the map, with its legend, then fills it. The
      // legend runs the map's width, so it may wrap differently once the map is resized: measured
      // again until the two agree.
      let height = MIN_MAP_HEIGHT
      for (let pass = 0; pass < 3; pass++) {
        const legend = ref.current?.querySelector<HTMLElement>('.map-legend')?.offsetHeight ?? 0
        const fits = Math.max(MIN_MAP_HEIGHT, (detailsRef.current?.offsetHeight ?? 0) - legend - LEGEND_GAP)
        if (fits === height) break
        height = fits
        flushSync(() => setMapHeight(fits))
      }
      await ref.current?.querySelector('img')?.decode?.()
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
            <p className="picture__title">{caption.title}</p>
            <div className="view-picture__body">
              <div ref={detailsRef} className="view-picture__details">
                {/* The place in focus and what it's made of; then how it compares with others. */}
                <div className="panel view-picture__column">
                  <FocusSummary />
                  <Breakdown />
                </div>
                <div className="panel view-picture__column">
                  <BoroughBars />
                  <TopAreas />
                  <Firehouses />
                </div>
                {big ? (
                  <section className="panel__section view-picture__trend">
                    <h3 className="panel__title">Trend · {big.place}</h3>
                    <div className="panel__context">{big.sub}</div>
                    <TrendReadout big={big} values={false} />
                    <TrendChart big={big} size={size} marked={false} />
                    {big.note && <div className="panel__context">{big.note}</div>}
                  </section>
                ) : (
                  // No trend to draw: the panel's own section says why.
                  <div className="panel view-picture__trend">
                    <Trend />
                  </div>
                )}
              </div>
              <div className="view-picture__map" style={{ width: `${Math.round((mapHeight * shot.width) / shot.height)}px` }}>
                <MapPicture shot={shot} legend={shot.legend} />
              </div>
            </div>
            <p className="picture__credit">{caption.credit}</p>
          </div>
        </div>
      )}
    </>
  )
}
