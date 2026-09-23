import { describe, expect, it } from 'vitest'
import {
  degradeQuality,
  initialQuality,
  initialRenderProfile,
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

  it('continues reducing bounded effects after atmosphere reaches its floor', () => {
    let state = initialQuality('efficient', 3)
    expect(state).toMatchObject({
      atmosphereRatio: 0.32,
      foregroundRatio: 1.5,
      particleFraction: 0.6,
      halo: false,
      detail: false,
    })
    for (let i = 0; i < 12; i++) state = degradeQuality(state)
    expect(state.atmosphereRatio).toBe(0.32)
    expect(state.halo).toBe(false)
    expect(state.detail).toBe(false)
    expect(state.particleFraction).toBeCloseTo(0.46)
    expect(degradeQuality(state)).toEqual(state)
  })

  it('keeps the cinematic profile at its full initial quality', () => {
    expect(initialQuality('cinematic', 2)).toMatchObject({
      atmosphereRatio: 1.5,
      foregroundRatio: 1.5,
      particleFraction: 1,
      halo: true,
      detail: true,
    })
  })
})
