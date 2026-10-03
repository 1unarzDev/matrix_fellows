import { describe, expect, it } from 'vitest'
import { createWheelInputPolicy } from '../../app/lib/wheel-input'

describe('wheel gesture routing, not hardware identification', () => {
  it('smooths explicit line/page wheel units immediately', () => {
    const input = createWheelInputPolicy()
    expect(input.observe({ deltaMode: 1, deltaY: 3, deltaX: 0 }, 0)).toBe('smooth')
    expect(input.observe({ deltaMode: 2, deltaY: -1, deltaX: 0 }, 30)).toBe('smooth')
  })
  it('keeps precision input and its large inertial tail native', () => {
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
      expect(input.observe({ deltaMode: 0, deltaY: deltaY!, deltaX: 0 }, time!)).toBe('native')
  })
  it('requires repeatable discrete pixel notches and supports switching inputs', () => {
    const input = createWheelInputPolicy()
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 0)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 70)).toBe('smooth')
    expect(input.observe({ deltaMode: 0, deltaY: 5.5, deltaX: 0 }, 85)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 500)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 100, deltaX: 0 }, 560)).toBe('smooth')
  })
  it('does not guess a mouse from a fast, variable trackpad burst or horizontal input', () => {
    const input = createWheelInputPolicy()
    for (const [time, deltaY] of [
      [0, 170],
      [10, 211],
      [20, 98],
      [30, 44],
    ])
      expect(input.observe({ deltaMode: 0, deltaY: deltaY!, deltaX: 0 }, time!)).toBe('native')
    expect(input.observe({ deltaMode: 0, deltaY: 120, deltaX: 2 }, 100)).toBe('native')
  })
})
