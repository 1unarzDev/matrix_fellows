import { describe, expect, it } from 'vitest'
import { nextFrameTime, settleProgress } from '../../app/lib/scene/frame-clock'

describe('30 Hz frame pacing', () => {
  it('settles touch camera steps identically at 30 and 60 Hz without overshoot', () => {
    const sample = (fps: number) => {
      let progress = 2
      for (let i = 0; i < fps / 2; i++) {
        progress = settleProgress(progress, 2.4, 1 / fps)
        expect(progress).toBeLessThanOrEqual(2.4)
      }
      return progress
    }
    expect(sample(30)).toBeCloseTo(sample(60), 5)
    expect(Math.abs(sample(30) - 2.4)).toBeLessThan(0.001)
    expect(settleProgress(2.4, 2, 1 / 30)).toBeGreaterThan(2)
  })
  it('does not skip slightly early low-power callbacks', () => {
    let last = 0
    for (let i = 1; i <= 90; i++) {
      const next = nextFrameTime(i * 33.1, last)
      expect(next).not.toBeNull()
      last = next!
    }
  })
  it('still limits a 60 Hz callback stream', () => {
    let last = 0, count = 0
    for (let i = 1; i <= 120; i++) {
      const next = nextFrameTime(i * 1000 / 60, last)
      if (next !== null) { last = next; count++ }
    }
    expect(count).toBeGreaterThanOrEqual(59)
    expect(count).toBeLessThanOrEqual(61)
  })
})
