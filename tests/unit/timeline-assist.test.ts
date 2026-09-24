import { describe, expect, it } from 'vitest'
import { getTimelineAssist } from '../../app/lib/timeline-assist'

const assist = (interval: number, position: number, velocity: number, direction = 1) =>
  getTimelineAssist({
    interval,
    position,
    velocity,
    direction,
    scroll: position * 1_000,
    start: 0,
    end: 1_000,
    restStart: 0,
    restEnd: 1_000,
  })

describe('cinematic boundary assistance', () => {
  it('leaves connect and join completely unsnapped', () => {
    expect(assist(4, 0.55, 2_400)).toMatchObject({ mode: 'none', destination: 550 })
  })

  it('uses only a slight partial pull between depths and connect', () => {
    const result = assist(3, 0.55, 2_000)
    expect(result.mode).toBe('glide')
    expect(result.destination).toBeGreaterThan(550)
    expect(result.destination).toBeLessThan(600)
  })

  it('keeps slow beginning and discovery travel free of assistance', () => {
    expect(assist(0, 0.55, 500).mode).toBe('none')
    expect(assist(0, 0.55, 1_000).mode).toBe('glide')
    expect(assist(0, 0.55, 1_800)).toMatchObject({ mode: 'complete', destination: 1_000 })
  })

  it('completes a decisive discovery gesture but only glides a moderate one', () => {
    expect(assist(1, 0.45, 1_000).mode).toBe('glide')
    expect(assist(1, 0.45, 1_700)).toMatchObject({ mode: 'complete', destination: 1_000 })
  })

  it('gently assists even slow travel through the research water phase', () => {
    const slow = assist(2, 0.72, 120)
    const fast = assist(2, 0.72, 1_200)
    expect(slow.mode).toBe('glide')
    expect(slow.destination).toBeGreaterThan(720)
    expect(fast.destination).toBeGreaterThan(slow.destination)
    expect(fast.destination).toBeLessThan(1_000)
  })

  it('never reverses an upward gesture', () => {
    const result = assist(2, 0.45, 900, -1)
    expect(result.mode).toBe('glide')
    expect(result.destination).toBeLessThan(450)
  })
})
