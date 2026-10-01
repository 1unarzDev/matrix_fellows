import { describe, expect, it } from 'vitest'
import {
  degradeQuality,
  initialQuality,
  initialRenderProfile,
  recoverQuality,
} from '../../app/lib/scene/render-quality'

describe('render quality policy', () => {
  it('protects landscape touch devices independently of viewport width', () => {
    expect(initialRenderProfile({ coarsePointer: true, hardwareConcurrency: 10 })).toBe('efficient')
  })

  it('protects weak wide-screen devices without user-agent or width checks', () => {
    expect(initialRenderProfile({ coarsePointer: false, hardwareConcurrency: 4 })).toBe('efficient')
    expect(
      initialRenderProfile({ coarsePointer: false, hardwareConcurrency: 12, deviceMemory: 4 }),
    ).toBe('efficient')
    expect(
      initialRenderProfile({ coarsePointer: false, hardwareConcurrency: 12, deviceMemory: 8 }),
    ).toBe('cinematic')
  })

  it('preserves native foreground, full effects and density at the procedural floor', () => {
    let state = initialQuality('efficient', 3)
    expect(state).toMatchObject({
      atmosphereRatio: 1,
      foregroundRatio: 3,
      particleFraction: 1,
      halo: false,
      detail: true,
    })
    for (let i = 0; i < 12; i++) state = degradeQuality(state)
    expect(state.atmosphereRatio).toBe(1)
    expect(state.halo).toBe(false)
    expect(state.detail).toBe(true)
    expect(state.particleFraction).toBe(1)
    expect(degradeQuality(state)).toEqual(state)
  })

  it('keeps the cinematic profile at its full initial quality', () => {
    expect(initialQuality('cinematic', 2)).toMatchObject({
      atmosphereRatio: 2,
      foregroundRatio: 2,
      particleFraction: 1,
      halo: true,
      detail: true,
    })
  })
  it('recovers after transient pressure and couples desktop scales to real composer sizing', () => {
    const desktop = initialQuality('cinematic', 2)
    const reduced = degradeQuality(desktop)
    expect(reduced.foregroundRatio).toBe(reduced.atmosphereRatio)
    expect(reduced.foregroundRatio).toBeLessThan(desktop.foregroundRatio)
    expect(recoverQuality(reduced, 2)).toEqual({ ...desktop, step: 2 })
    let mobile = initialQuality('efficient', 3)
    for (let step = 0; step < 8; step++) mobile = recoverQuality(mobile, 3)
    expect(mobile.atmosphereRatio).toBe(3)
    expect(mobile.foregroundRatio).toBe(3)
    expect(degradeQuality(mobile).atmosphereRatio).toBeLessThan(3)
  })
})
