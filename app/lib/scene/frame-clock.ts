// Preserve a nominal phase when balanced RAF jitter moves a callback slightly
// early. Rejecting it outright can halve an otherwise matching 30/60 Hz stream.
// A phase advance, rather than resetting every early grant to `now`, retains
// the budget on higher-refresh displays. This timestamp is scheduling-only;
// animation and profiling continue to use the actual callback/render time.
export function nextFrameTime(
  now: number,
  last: number,
  fps = 30,
  rawInterval?: number,
): number | null {
  const interval = 1000 / fps
  const delta = now - last
  const tolerance = Math.max(1, interval * 0.15)
  const steadyTolerance = interval * 0.008
  if (delta < interval - tolerance) return null
  // A genuinely matching, marginally early stream (e.g. 33.1 ms) can follow
  // actual time without a rare double throttle. The raw callback interval must
  // match: elapsed time since the last *submitted* frame is not that evidence
  // on high-refresh displays. Bound this soft grace to <0.5 extra fps at 60 Hz.
  if (
    delta < interval &&
    delta >= interval - steadyTolerance &&
    rawInterval !== undefined &&
    Math.abs(rawInterval - interval) <= steadyTolerance
  )
    return now
  return last + Math.max(1, Math.floor(delta / interval)) * interval
}

// A short, frame-rate-independent camera settle absorbs stepped touch events.
// This never changes document scrolling or the duration of native inertia.
export function settleProgress(current: number, target: number, seconds: number): number {
  const next = target + (current - target) * Math.exp(-Math.max(0, seconds) / 0.075)
  return Math.abs(next - target) < 0.0001 ? target : next
}
