# Physical-device performance procedure

Use this protocol to resolve the owner's approximately 10 fps report. Desktop
mobile emulation, CPU throttling, and SwiftShader are useful regression tools but
cannot establish iOS/Android GPU, compositor, thermal, or battery behavior.

## Devices and conditions

Test the deployed production build—not a dev server—on:

- the owner's affected phone;
- one recent iPhone and one older/midrange iPhone in Safari;
- one budget or midrange Android phone in Chrome.

For each iPhone, run once normally and once with Low Power Mode enabled. Begin
from a stable room-temperature device with no screen recording, charging, or
other foreground apps. Record model, OS/browser version, power mode, battery
level, orientation, viewport, network, and whether the device was already warm.

## Reproducible run

1. Open the production URL with `?matrixProfile=1`, clear that site's cache for
   the cold run, and load at the top of the page. Do not reload until the first
   valid scene frame or the 12-second fallback has resolved.
2. Record navigation start, readable SSR content, first scene, and reveal times.
   Note any long unresponsive interval rather than attributing it to the loader.
3. Tap each mobile chapter destination once. For one representative tap, record
   input-to-next-paint latency with Safari Web Inspector or Chrome DevTools.
4. Scroll continuously from chapter 0 through 5 over 60 seconds, then reverse to
   chapter 0 over 60 seconds. Do not omit the storm/ocean/descent transition.
5. Repeat the 120-second journey after a warm reload. Then remain stationary in
   the nebula for 60 seconds and repeat one more journey to expose thermal
   degradation.
6. Rotate portrait → landscape → portrait and exercise browser chrome collapse/
   expansion. Confirm native touch scrolling, the efficient profile, sharp
   foreground, stable framing, and no repeated render-target reallocations.
7. Background the tab for 15 seconds, return, and confirm rendering resumes
   without treating the hidden interval as a stall. Navigate to `/guides` and
   confirm the canvas and GPU activity stop.

## Measurements

Capture ten-second windows from `window.__matrixWorldProfile.frames`. For each
window report rendered fps, rendered-frame p95, maximum interval, >100 ms stalls,
CPU submission p95, quality step, atmosphere ratio, particle fraction, draw
calls, triangles, and points. Report GPU timer-query data only when available and
not disjoint. Keep browser RAF cadence separate from submitted/rendered frames.

Also record the canvas diagnostics (`data-render-profile`, `data-pixel-ratio`,
`data-atmosphere-ratio`, `data-quality-step`, `data-fps`, calls, triangles,
points, compile and first-scene times), visible artifacts, device temperature or
thermal warning, and battery change over the test.

## Acceptance and interpretation

- Each active ten-second journey window targets 28–30 rendered fps.
- Rendered-frame interval p95 must be at or below 50 ms, with no recurring
  intervals above 100 ms after warm-up.
- Sampled tap-to-next-paint should be at or below 200 ms.
- The foreground and DOM remain sharp; native touch scrolling, all six chapter
  compositions, reverse navigation, water continuity, and fallback content stay
  intact.
- Static fallback counts only as failure recovery, never as animated success.

If a device fails, export the frame profile and Safari/Chrome performance trace,
identify the failing chapter/window, note the final quality tier, and compare a
normal run with a paused-WebGL control. Do not lower the global quality floor or
remove an art-direction feature based only on a single stationary FPS reading.
