import { describe, expect, it } from 'vitest'
import { lightTheme } from '../theme/tokens'
import { buildStyle } from './style'

describe('buildStyle', () => {
  it('paints the water behind the city', () => {
    const background = buildStyle(lightTheme).layers.find((l) => l.id === 'background')
    expect(background?.paint).toEqual({ 'background-color': lightTheme.color.mapWater })
  })
})
