export type WheelInputMode = 'native' | 'smooth'
interface WheelSample {
  deltaMode: number
  deltaX: number
  deltaY: number
}

// WheelEvent exposes units and gesture samples, not the physical device.
// Prefer native delivery when ambiguous. No UA lookup, timers, event history,
// allocation or layout reads; one policy per adapter supports hybrid input.
export function createWheelInputPolicy() {
  let previousNotch = 0
  let previousAt = -Infinity
  let precisionGesture = false
  return {
    observe(event: WheelSample, now: number): WheelInputMode {
      if (event.deltaMode !== 0) {
        previousNotch = 0
        precisionGesture = false
        previousAt = now
        return 'smooth'
      }
      const magnitude = Math.abs(event.deltaY)
      if (now - previousAt > 240) precisionGesture = false
      const discrete =
        magnitude >= 80 &&
        Number.isInteger(magnitude) &&
        (magnitude % 40 === 0 || magnitude % 100 === 0)
      if (event.deltaX !== 0 || !discrete) {
        precisionGesture = true
        previousNotch = 0
        previousAt = now
        return 'native'
      }
      const repeated = now - previousAt <= 240 && previousNotch === magnitude
      previousNotch = magnitude
      previousAt = now
      return !precisionGesture && repeated ? 'smooth' : 'native'
    },
  }
}
