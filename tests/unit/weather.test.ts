import { describe, expect, it } from 'vitest'
import {
  floodHeight,
  stormStrength,
  cameraFloodRise,
  lightningState,
  rainStrength,
} from '../../app/lib/scene/shaders'

describe('scroll-driven storm and flood', () => {
  it('preserves the desert and initial oasis', () => {
    for (const progress of [0, 0.3, 0.6, 1]) {
      expect(floodHeight(progress)).toBe(0)
      expect(stormStrength(progress)).toBe(0)
    }
  })
  it('gathers the storm before a monotonic flood', () => {
    expect(stormStrength(1.28)).toBeGreaterThan(0.5)
    expect(floodHeight(1.28)).toBe(0)
    let previous = 0
    for (let progress = 1.28; progress <= 2; progress += 0.01) {
      const height = floodHeight(progress)
      expect(height).toBeGreaterThanOrEqual(previous)
      expect(height).toBeLessThanOrEqual(18)
      previous = height
    }
    expect(floodHeight(2)).toBe(18)
  })
  it('settles during the dive and reverses without retained flood state', () => {
    expect(stormStrength(1.5)).toBe(1)
    expect(stormStrength(2.8)).toBe(1)
    expect(stormStrength(3.2)).toBe(0)
    expect(rainStrength(2.4)).toBe(0)
    expect(rainStrength(3)).toBe(0)
    expect(floodHeight(3)).toBe(18)
    expect(floodHeight(0)).toBe(0)
  })
  it('keeps the camera above the flood until the intentional dive', () => {
    expect(cameraFloodRise(1.5)).toBe(0)
    expect(floodHeight(1.55)).toBe(2)
    for (let progress = 1.65; progress <= 2.1; progress += 0.01) {
      expect(cameraFloodRise(progress)).toBe(floodHeight(progress))
    }
    expect(cameraFloodRise(1.95)).toBe(floodHeight(1.95))
    expect(cameraFloodRise(4.15)).toBe(0)
  })
  it('keeps generating distinct, spaced strikes without any scroll input', () => {
    const strikes = new Set<number>()
    for (let time = 0; time < 28; time += 0.02) {
      const strike = lightningState(time)
      expect(strike.intensity).toBeGreaterThanOrEqual(0)
      expect(strike.intensity).toBeLessThanOrEqual(1)
      if (strike.intensity > 0.5) strikes.add(strike.seed)
    }
    expect([...strikes]).toEqual([0, 1, 2, 3])
  })
})
