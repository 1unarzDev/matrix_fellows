// All storm/flood/dive/cosmic weights are exactly zero before this boundary.
// This is compiler specialization, not a different level of visual detail.
export type WorldShaderPhase = 'land' | 'storm' | 'journey'
export function worldShaderPhase(progress: number): WorldShaderPhase {
  if (progress < 1.06) return 'land'
  // Full overcast/rain, before surface immersion begins. Flood, swell, water
  // detail and the ocean expansion remain the same progress-dependent fields.
  if (progress >= 1.42 && progress <= 2.1) return 'storm'
  return 'journey'
}
