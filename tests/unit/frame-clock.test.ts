import { describe, expect, it } from 'vitest'
import { nextFrameTime } from '../../app/lib/scene/frame-clock'

describe('30 Hz frame pacing', () => {
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
