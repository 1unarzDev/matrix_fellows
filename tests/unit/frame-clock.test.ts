import { describe, expect, it } from 'vitest'
import { nextFrameTime, settleProgress } from '../../app/lib/scene/frame-clock'

describe('cinematic frame pacing', () => {
  it('uses available callbacks below its budget and stays within budget above it across jittered cadences', () => {
    for (const pattern of ['balanced', 'random']) {
      for (const targetFps of [30, 60]) {
        for (let callbackFps = 20; callbackFps <= 240; callbackFps++) {
          let last = 0,
            previous = 0,
            count = 0
          let seed = 217
          for (let frame = 1; frame <= callbackFps * 10; frame++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            const jitter =
              pattern === 'random'
                ? ((seed / 4294967296 - 0.5) * 0.2 * 1000) / callbackFps
                : -(frame % 2 ? Math.min((1000 / callbackFps) * 0.1, 3) : 0)
            const now = (frame * 1000) / callbackFps + jitter
            const next = nextFrameTime(now, last, targetFps, now - previous)
            previous = now
            if (next !== null) {
              last = next
              count++
            }
          }
          const expected = Math.min(callbackFps, targetFps) * 10
          expect(
            count,
            `${pattern}: target=${targetFps}, callbacks=${callbackFps}`,
          ).toBeGreaterThanOrEqual(expected - 5)
          expect(
            count,
            `${pattern}: target=${targetFps}, callbacks=${callbackFps}`,
          ).toBeLessThanOrEqual(expected + 5)
        }
      }
    }
  })
  it('does not halve matching-rate delivery when callbacks alternate slightly early and late', () => {
    for (const fps of [30, 60]) {
      const interval = 1000 / fps
      let last = 0
      for (let frame = 1; frame <= 120; frame++) {
        // Balanced jitter: every other callback arrives 10% early, but the
        // two-frame period and average callback cadence remain exact.
        const now = frame * interval - (frame % 2 ? interval * 0.1 : 0)
        const next = nextFrameTime(now, last, fps)
        expect(next, `fps=${fps}, frame=${frame}`).not.toBeNull()
        last = next!
      }
    }
  })
  it('retains its budget with jittered high-refresh callbacks instead of drifting faster', () => {
    for (const callbackFps of [75, 90, 120, 144]) {
      for (const targetFps of [30, 60]) {
        let last = 0,
          count = 0
        for (let frame = 1; frame <= callbackFps * 4; frame++) {
          const now = ((frame - (frame % 2 ? 0.1 : 0)) * 1000) / callbackFps
          const next = nextFrameTime(now, last, targetFps)
          if (next !== null) {
            last = next
            count++
          }
        }
        expect(count).toBeGreaterThanOrEqual(targetFps * 4 - 1)
        expect(count).toBeLessThanOrEqual(targetFps * 4 + 1)
      }
    }
  })
  it('renders every callback in active 60 Hz and constrained 30 Hz streams', () => {
    for (const cadence of [16.65, 33.1]) {
      let last = 0
      for (let frame = 1; frame <= 90; frame++) {
        const next = nextFrameTime(frame * cadence, last, 60)
        expect(next).not.toBeNull()
        last = next!
      }
    }
  })
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
      const next = nextFrameTime(i * 33.1, last, 30, 33.1)
      expect(next).not.toBeNull()
      last = next!
    }
  })
  it('still limits a 60 Hz callback stream', () => {
    let last = 0,
      count = 0
    for (let i = 1; i <= 120; i++) {
      const next = nextFrameTime((i * 1000) / 60, last)
      if (next !== null) {
        last = next
        count++
      }
    }
    expect(count).toBeGreaterThanOrEqual(59)
    expect(count).toBeLessThanOrEqual(61)
  })
})
