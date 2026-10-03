import { describe, expect, it } from 'vitest'
import { createWheelInputPolicy } from '../../app/lib/wheel-input'

describe('wheel gesture routing, not hardware identification', () => {
  it('smooths explicit line/page wheel units immediately', () => {
    const input = createWheelInputPolicy()
    expect(input.observe({ deltaMode: 1, deltaY: 3, deltaX: 0 }, 0)).toBe('smooth')
    expect(input.observe({ deltaMode: 2, deltaY: -1, deltaX: 0 }, 30)).toBe('smooth')
  })
  it('smooths precision input and its large inertial tail', () => {
    const input = createWheelInputPolicy()
    for (const [time, deltaY] of [
      [0, 1.5],
      [8, 10],
      [16, 120],
      [24, 120],
      [32, 14],
      [200, 120],
      [350, 120],
      [500, 120],
    ])
      expect(input.observe({ deltaMode: 0, deltaY: deltaY!, deltaX: 0 }, time!)).toBe('smooth')
  })
  it('smooths pixel wheels immediately without gesture warmup', () => {
    const input = createWheelInputPolicy()
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 0)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 70)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 5.5, deltaX: 0 }, 85)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 500)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 560)).toBe('smooth')
  })
  it('smooths variable trackpad bursts but preserves horizontal input', () => {
    const input = createWheelInputPolicy()
    for (const [time, deltaY] of [
      [0, 170],
      [10, 211],
      [20, 98],
      [30, 44],
    ])
      expect(input.observe({ deltaMode: 0, deltaY: deltaY!, deltaX: 0 }, time!)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 120, deltaX: 2 }, 100)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 2, deltaX: 120 }, 110)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 0, deltaX: 120 }, 120)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 0, deltaX: 0 }, 130)).toBe('native')
  })
})
