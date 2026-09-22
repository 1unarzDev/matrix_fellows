export type RenderProfile = 'cinematic' | 'efficient'

export interface DeviceSignals {
  coarsePointer: boolean
  hardwareConcurrency?: number
  deviceMemory?: number
}

export interface QualityState {
  profile: RenderProfile
  step: number
  atmosphereRatio: number
  particleFraction: number
  halo: boolean
  detail: boolean
}

export function initialRenderProfile(signals: DeviceSignals): RenderProfile {
  // Input modality is a useful conservative starting signal for phones and
  // tablets, including landscape devices wider than the layout breakpoint.
  // Weak wide-screen devices are also protected without consulting user-agent
  // strings. Runtime observations remain the authority for further reduction.
  if (signals.coarsePointer) return 'efficient'
  if (signals.hardwareConcurrency && signals.hardwareConcurrency <= 4) return 'efficient'
  if (signals.deviceMemory && signals.deviceMemory <= 4) return 'efficient'
  return 'cinematic'
}

export function initialQuality(profile: RenderProfile, devicePixelRatio: number): QualityState {
  return profile === 'efficient'
    ? {
        profile,
        step: 0,
        // Phones previously began at 0.7, then repeatedly reallocated this
        // full-screen target while they were already missing frames. Start at
        // the measured steady-state tier instead. The foreground remains at a
        // full 1x ratio; only the naturally soft atmosphere is downsampled.
        atmosphereRatio: Math.min(devicePixelRatio, 0.32),
        particleFraction: 0.6,
        halo: false,
        detail: false,
      }
    : {
        profile,
        step: 0,
        atmosphereRatio: Math.min(devicePixelRatio, 1.5),
        particleFraction: 1,
        halo: true,
        detail: true,
      }
}

export function degradeQuality(state: QualityState): QualityState {
  const minimumRatio = state.profile === 'efficient' ? 0.32 : 0.65
  if (state.atmosphereRatio > minimumRatio + 0.001)
    return {
      ...state,
      step: state.step + 1,
      atmosphereRatio: Math.max(minimumRatio, state.atmosphereRatio * 0.85),
      particleFraction: Math.max(0.72, state.particleFraction * 0.88),
    }

  // Resolution has a hard floor so the atmosphere remains coherent. Further
  // sustained overload removes only the small mobile halo and bounded particle
  // overdraw; both switches are allocation-free and do not compile new shaders.
  if (state.halo)
    return {
      ...state,
      step: state.step + 1,
      halo: false,
      detail: false,
      particleFraction: Math.max(0.6, state.particleFraction * 0.82),
    }
  if (state.particleFraction > 0.46)
    return {
      ...state,
      step: state.step + 1,
      particleFraction: Math.max(0.46, state.particleFraction * 0.8),
    }
  return state
}
