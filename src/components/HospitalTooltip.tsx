import { CardClose } from './CardClose'
import { useSheet } from './dialog'
import { useCardPosition } from './useCardPosition'
import './MapTooltip.css'
import './FirehouseTooltip.css'

type Props = {
  name: string; address: string; borough: string
  label?: string
} & (
  | { pointer: { x: number; y: number }; area: { width: number; height: number }; sheet?: never }
  | { sheet: { onClose: () => void }; pointer?: never; area?: never }
)

export function HospitalTooltip({ name, address, borough, label = 'Hospital', pointer, area, sheet }: Props) {
  const ref = useCardPosition(pointer, area)
  useSheet(ref, sheet?.onClose)
  return (
    <div
      ref={ref}
      className={sheet ? 'map-tooltip map-tooltip--sheet firehouse-card' : 'map-tooltip firehouse-card'}
      {...(sheet ? { role: 'region', tabIndex: -1, 'aria-label': `${label}, ${name}` } : { 'aria-hidden': true })}
    >
      <div className="firehouse-card__head">
        <span className="map-tooltip__metric firehouse-card__kicker">
          {label}
          {sheet && <CardClose onClose={sheet.onClose} />}
        </span>
        <span className="map-tooltip__title">{name}</span>
        <span className="map-tooltip__subtitle">{address} · {borough}</span>
      </div>
    </div>
  )
}
