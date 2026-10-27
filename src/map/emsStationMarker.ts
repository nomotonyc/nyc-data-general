/** Runtime bitmap used by MapLibre for EMS station symbols. */
export const EMS_STATION_MARKER = 'ems-station-marker'

const colour = (hex: string) => {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16))
}

const inside = (x: number, y: number, points: readonly (readonly [number, number])[]) => {
  const signs = points.map(([ax, ay], i) => {
    const [bx, by] = points[(i + 1) % points.length]
    return (x - bx) * (ay - by) - (ax - bx) * (y - by)
  })
  return signs.every((n) => n >= 0) || signs.every((n) => n <= 0)
}

/** A green triangle with a white border, antialiased at four samples per axis. */
export function emsStationMarkerImage(fill: string, size = 64) {
  const data = new Uint8Array(size * size * 4)
  const outer = [[size * 0.5, size * 0.04], [size * 0.96, size * 0.92], [size * 0.04, size * 0.92]] as const
  const centre = [size * 0.5, size * 0.627] as const
  const inner = outer.map(([x, y]) => [centre[0] + (x - centre[0]) * 0.76, centre[1] + (y - centre[1]) * 0.76] as const)
  const [red, green, blue] = colour(fill)
  const samples = [0.125, 0.375, 0.625, 0.875]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let outerCoverage = 0
      let innerCoverage = 0
      for (const sy of samples) {
        for (const sx of samples) {
          if (inside(x + sx, y + sy, outer)) outerCoverage += 1
          if (inside(x + sx, y + sy, inner)) innerCoverage += 1
        }
      }
      if (outerCoverage === 0) continue
      const borderCoverage = outerCoverage - innerCoverage
      const index = (y * size + x) * 4
      data[index] = Math.round((borderCoverage * 255 + innerCoverage * red) / 16)
      data[index + 1] = Math.round((borderCoverage * 255 + innerCoverage * green) / 16)
      data[index + 2] = Math.round((borderCoverage * 255 + innerCoverage * blue) / 16)
      data[index + 3] = Math.round((outerCoverage / 16) * 255)
    }
  }
  return { width: size, height: size, data }
}
