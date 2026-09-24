export type TimelineAssistMode = 'none' | 'glide' | 'complete'

export interface TimelineAssist {
  destination: number
  mode: TimelineAssistMode
  duration: number
}

interface TimelineAssistOptions {
  interval: number
  position: number
  direction: number
  velocity: number
  scroll: number
  start: number
  end: number
  restStart: number
  restEnd: number
}

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value))

function inDirectionalWindow(
  position: number,
  direction: number,
  down: [number, number],
  up: [number, number],
) {
  const [minimum, maximum] = direction > 0 ? down : up
  return position >= minimum && position <= maximum
}

function glide(options: TimelineAssistOptions, minimum: number, maximum: number, strength: number) {
  const distance = (options.end - options.start) * (minimum + (maximum - minimum) * clamp(strength))
  const destination =
    options.direction > 0
      ? Math.min(options.restEnd, options.scroll + distance)
      : Math.max(options.restStart, options.scroll - distance)
  return {
    destination,
    mode: 'glide' as const,
    duration: 0.72 - clamp(strength) * 0.16,
  }
}

/**
 * Directional assistance for the five cinematic boundaries. This deliberately
 * does not behave like CSS scroll snap: most gestures receive either no help
 * or a short continuation, and only a decisive flick completes a chapter.
 */
export function getTimelineAssist(options: TimelineAssistOptions): TimelineAssist {
  const none = { destination: options.scroll, mode: 'none' as const, duration: 0 }
  if (!options.direction) return none

  // Beginning ↔ Discovery: slow reading is completely free. A moderate wheel
  // gesture gets a small continuation; a decisive flick completes the move.
  if (options.interval === 0) {
    if (
      options.velocity < 800 ||
      !inDirectionalWindow(options.position, options.direction, [0.3, 0.84], [0.16, 0.7])
    )
      return none
    if (options.velocity >= 1_550)
      return {
        destination: options.direction > 0 ? options.restEnd : options.restStart,
        mode: 'complete',
        duration: 0.5,
      }
    return glide(options, 0.018, 0.055, (options.velocity - 800) / 750)
  }

  // Discovery ↔ Research: recognize a full swipe/quick wheel burst, while
  // keeping the common moderate gesture calm instead of magnetizing it.
  if (options.interval === 1) {
    if (
      options.velocity < 650 ||
      !inDirectionalWindow(options.position, options.direction, [0.2, 0.9], [0.1, 0.8])
    )
      return none
    if (options.velocity >= 1_400)
      return {
        destination: options.direction > 0 ? options.restEnd : options.restStart,
        mode: 'complete',
        duration: 0.52,
      }
    return glide(options, 0.025, 0.075, (options.velocity - 650) / 750)
  }

  // Research ↔ Depths: this is the one persistent assist. A small directional
  // continuation carries slow input through the water/camera phase; velocity
  // scales the distance, and only a clear flick reaches the next rest frame.
  if (options.interval === 2) {
    if (
      options.velocity < 35 ||
      !inDirectionalWindow(options.position, options.direction, [0.6, 0.94], [0.2, 0.6])
    )
      return none
    if (options.velocity >= 1_500)
      return {
        destination: options.direction > 0 ? options.restEnd : options.restStart,
        mode: 'complete',
        duration: 0.54,
      }
    return glide(options, 0.022, 0.115, (options.velocity - 35) / 1_465)
  }

  // Depths ↔ Connect: just enough motion to discourage resting in the visual
  // seam. This boundary never snaps all the way to an anchor.
  if (options.interval === 3) {
    if (
      options.velocity < 420 ||
      !inDirectionalWindow(options.position, options.direction, [0.42, 0.72], [0.28, 0.58])
    )
      return none
    return glide(options, 0.012, 0.035, (options.velocity - 420) / 1_200)
  }

  // Connect ↔ Join is ordinary document scrolling. The join content is long
  // and interactive, so even a subtle automated pull is counterproductive.
  return none
}
