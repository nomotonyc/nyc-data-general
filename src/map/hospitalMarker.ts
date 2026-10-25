/** Runtime bitmap used by MapLibre for hospital symbols. */
export const HOSPITAL_MARKER = 'hospital-marker'

/**
 * A small red medical cross in a ring, recreated from the supplied reference.
 * Drawing it here keeps the marker crisp without adding another network request.
 */
export function hospitalMarkerImage(size = 64) {
  const data = new Uint8Array(size * size * 4)
  const centre = (size - 1) / 2
  const outer = size * 0.47
  const inner = size * 0.39
  const crossHalfWidth = size * 0.105
  const crossHalfLength = size * 0.31
  const samples = [0.125, 0.375, 0.625, 0.875]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let circle = 0
      let ring = 0
      let cross = 0
      for (const sy of samples) {
        for (const sx of samples) {
          const dx = x + sx - centre
          const dy = y + sy - centre
          const distance = Math.hypot(dx, dy)
          if (distance <= outer) circle += 1
          if (distance <= outer && distance >= inner) ring += 1
          if ((Math.abs(dx) <= crossHalfWidth && Math.abs(dy) <= crossHalfLength)
            || (Math.abs(dy) <= crossHalfWidth && Math.abs(dx) <= crossHalfLength)) cross += 1
        }
      }
      const coverage = circle / 16
      if (coverage === 0) continue
      const red = Math.min(1, (ring + cross) / 16)
      const index = (y * size + x) * 4
      // Red #f10f1a over a white disc, with transparent pixels outside it.
      data[index] = Math.round(255 * coverage)
      data[index + 1] = Math.round((255 - 240 * red) * coverage)
      data[index + 2] = Math.round((255 - 229 * red) * coverage)
      data[index + 3] = Math.round(255 * coverage)
    }
  }
  return { width: size, height: size, data }
}
