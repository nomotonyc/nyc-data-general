/**
 * Equal-interval bins over the values currently shown, one ramp step each,
 * lightest for the lowest.
 */
export function equalIntervalScale(values: readonly number[], ramp: readonly string[]): (v: number) => string {
  if (values.length === 0) throw new Error('Cannot build a colour scale from no values')
  const lo = Math.min(...values)
  const span = Math.max(...values) - lo
  const last = ramp.length - 1
  return (v) => {
    if (span === 0) return ramp[Math.floor(last / 2)]
    const step = Math.floor(((v - lo) / span) * ramp.length)
    return ramp[Math.min(last, Math.max(0, step))]
  }
}
