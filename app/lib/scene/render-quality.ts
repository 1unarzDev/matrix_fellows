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
  foregroundRatio: number
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
        // Input modality chooses a pass structure, not a permanent detail cap.
        // Start at CSS-resolution procedural imagery and native foreground;
        // sustained capacity can recover the procedural layer to native DPR.
        atmosphereRatio: Math.min(devicePixelRatio, 1),
        foregroundRatio: Math.min(devicePixelRatio, 3),
        particleFraction: 1,
        halo: false,
        detail: true,
      }
    : {
        profile,
        step: 0,
        atmosphereRatio: Math.min(devicePixelRatio, 2),
        foregroundRatio: Math.min(devicePixelRatio, 2),
        particleFraction: 1,
        halo: true,
        detail: true,
      }
}

export function degradeQuality(state: QualityState): QualityState {
  const minimumRatio = Math.min(state.foregroundRatio, state.profile === 'efficient' ? 1 : 1.5)
  if (state.atmosphereRatio > minimumRatio + 0.001)
    return {
      ...state,
      step: state.step + 1,
      atmosphereRatio: Math.max(minimumRatio, state.atmosphereRatio * 0.85),
      // Desktop has no independent procedural target: its composer really
      // uses foregroundRatio. Keep both scales coherent on that path.
      foregroundRatio:
        state.profile === 'cinematic'
          ? Math.max(minimumRatio, state.atmosphereRatio * 0.85)
          : state.foregroundRatio,
    }

  return state
}

export function recoverQuality(state: QualityState, devicePixelRatio: number): QualityState {
  const maximum = Math.min(devicePixelRatio, state.profile === 'efficient' ? 3 : 2)
  if (state.atmosphereRatio >= maximum - 0.001) return state
  const ratio = Math.min(maximum, state.atmosphereRatio * 1.25)
  return {
    ...state,
    step: state.step + 1,
    atmosphereRatio: ratio,
    foregroundRatio: state.profile === 'cinematic' ? ratio : state.foregroundRatio,
  }
}
