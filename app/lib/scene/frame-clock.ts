// Tolerate sub-millisecond RAF jitter at the OS's own 30 Hz limit.
export function nextFrameTime(now: number, last: number): number | null {
  const interval = 1000 / 30
  const delta = now - last
  if (delta < interval - 1) return null
  return delta < interval ? now : now - (delta % interval)
}
