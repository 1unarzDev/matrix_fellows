import { describe, expect, it } from 'vitest'
import { worldShaderPhase } from '../../app/lib/scene/shader-phase'
import {
  floodHeight,
  rainStrength,
  stormStrength,
  swellStrength,
} from '../../app/lib/scene/shaders'

describe('exact land shader specialization', () => {
  it('selects the general program before any non-land effect becomes active, including reversals', () => {
    for (const progress of [0, 0.2, 0.8, 1, 1.059999]) {
      expect(worldShaderPhase(progress)).toBe('land')
      for (const weight of [floodHeight, rainStrength, stormStrength, swellStrength])
        expect(weight(progress)).toBe(0)
    }
    for (const progress of [1.06, 1.1, 1.6, 2.3, 3, 4.4, 5, 1.06])
      expect(worldShaderPhase(progress)).toBe(progress === 1.6 ? 'storm' : 'journey')
    for (const progress of [1.42, 1.5, 1.92, 2, 2.1]) {
      expect(worldShaderPhase(progress)).toBe('storm')
      expect(stormStrength(progress)).toBe(1)
      expect(rainStrength(progress)).toBe(1)
    }
    expect(worldShaderPhase(1.419999)).toBe('journey')
    expect(worldShaderPhase(2.100001)).toBe('journey')
    expect(worldShaderPhase(1.05)).toBe('land')
  })
})
