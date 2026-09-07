// Tolerate sub-millisecond RAF jitter at the OS's own 30 Hz limit.
export function nextFrameTime(now: number, last: number): number | null {
  const interval = 1000 / 30
  const delta = now - last
  if (delta < interval - 1) return null
  return delta < interval ? now : now - (delta % interval)
}

// A short, frame-rate-independent camera settle absorbs stepped touch events.
// This never changes document scrolling or the duration of native inertia.
export function settleProgress(current: number, target: number, seconds: number): number {
  const next = target + (current - target) * Math.exp(-Math.max(0, seconds) / 0.075)
  return Math.abs(next - target) < 0.0001 ? target : next
}
