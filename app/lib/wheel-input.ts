export type WheelInputMode = 'native' | 'smooth'
interface WheelSample {
  deltaMode: number
  deltaX: number
  deltaY: number
}

// WheelEvent exposes units and gesture samples, not the physical device.
// Smooth vertical wheel input from both mice and trackpads. Preserve horizontal
// gestures without hardware guesses, timers, allocation or layout reads.
export function createWheelInputPolicy() {
  return {
    observe(event: WheelSample, _now?: number): WheelInputMode {
      return event.deltaY !== 0 && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? 'smooth'
        : 'native'
    },
  }
}
