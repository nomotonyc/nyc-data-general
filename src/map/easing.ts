/**
 * CSS-style cubic-bezier timing function: time in [0, 1] → progress in [0, 1].
 * Solves for the curve parameter with Newton's method, falling back to bisection.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bezier = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3
  const slope = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s ** 2

  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let s = t
    for (let i = 0; i < 8; i++) {
      const error = bezier(x1, x2, s) - t
      const d = slope(x1, x2, s)
      if (Math.abs(error) < 1e-6) return bezier(y1, y2, s)
      if (Math.abs(d) < 1e-6) break
      s -= error / d
    }
    let lo = 0
    let hi = 1
    s = t
    for (let i = 0; i < 30; i++) {
      const x = bezier(x1, x2, s)
      if (Math.abs(x - t) < 1e-6) break
      if (x < t) lo = s
      else hi = s
      s = (lo + hi) / 2
    }
    return bezier(y1, y2, s)
  }
}

/** The camera's easing: CSS ease-in-out, a gentle start and settle, so moves never jolt. */
export const cameraEasing = cubicBezier(0.42, 0, 0.58, 1)
