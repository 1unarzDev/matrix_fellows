# Physical-device performance procedure

Use this protocol to resolve current smoothness/fidelity feedback and the historical,
unresolved approximately 10 fps report. Desktop
mobile emulation, CPU throttling, and SwiftShader are useful regression tools but
cannot establish iOS/Android GPU, compositor, thermal, or battery behavior.

## Devices and conditions

Test the deployed production build—not a dev server—on:

- the owner's affected phone;
- one recent iPhone and one older/midrange iPhone in Safari;
- one budget or midrange Android phone in Chrome;
- an iPad in Safari, an integrated-GPU laptop (normal and battery saving), and
  a capable desktop nonregression control.

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
window report scene-submission fps, intervals p95/p99, maximum, >100 ms stalls,
CPU update/submission p95, progress backlog/request age, actual buffer dimensions,
quality step, atmosphere ratio, particle fraction, draw
calls, triangles, and points. Report GPU timer-query data only when available and
not disjoint. Keep browser RAF cadence separate from submitted/rendered frames.

Also record the canvas diagnostics (`data-render-profile`, `data-pixel-ratio`,
`data-atmosphere-ratio`, `data-quality-step`, `data-fps`, calls, triangles,
points, compile and first-scene times), visible artifacts, device temperature or
thermal warning, and battery change over the test.

## Acceptance and interpretation

- Active windows target 58–60 new scene submissions with intervals concentrated
  near 16.7 ms where hardware/browser support 60 Hz. For demonstrated 30 Hz
  callback constraints, target 28–30 near 33.3 ms and label that condition honestly.
  Record higher-refresh cadence separately, missed presentation opportunities,
  p95/p99, and isolated spikes; no recurring >100 ms stalls after warm-up.
  Use browser presentation evidence when available, not render calls alone.
- Sampled tap-to-next-paint should be at or below 200 ms.
- The foreground and DOM remain sharp; native touch scrolling, all six chapter
  compositions, reverse navigation, water continuity, and fallback content stay
  intact.
- Static fallback counts only as failure recovery, never as animated success.

If a device fails, export the frame profile and Safari/Chrome performance trace,
identify the failing chapter/window, note the final quality tier, and compare a
normal run with a paused-WebGL control. Do not lower the global quality floor or
remove an art-direction feature based only on a single stationary FPS reading.

### Minimal laptop export

For the current laptop candidate, use the preview with `?matrixProfile=1` rather
than mixing production and preview builds across devices. After the warm
forward/reverse journey, click **Save performance report** in the small diagnostic
panel and attach the downloaded JSON. **Copy report** is an alternative; if the
browser refuses clipboard access, it downloads the report instead. The controls
exist only with profiling explicitly enabled and are absent from ordinary visits.
The export includes the loaded Nuxt build ID, existing frame/callback profile,
render state, canvas diagnostics and viewport/browser signals. It does not read
form answers, authentication state or browser storage. Supply power mode and
plugged-in/battery state separately; they are not inferred.

If the controls are unavailable, run this in the browser console and paste/save the copied
JSON. Firefox/Zen and Chromium developer consoles provide `copy()`; this reads
only rendering diagnostics, not form responses or authentication storage.

```js
copy(JSON.stringify({
  capturedAt: new Date().toISOString(),
  url: location.href,
  userAgent: navigator.userAgent,
  viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemory: navigator.deviceMemory ?? null,
  assets: [...document.scripts].map(script => script.src).filter(Boolean),
  canvas: { ...document.querySelector('canvas[data-engine]')?.dataset },
  state: window.__matrixWorldDebug?.snapshot(),
  profile: window.__matrixWorldProfile,
}))
```

Provide power mode, plugged-in/battery state, device model and refresh rate
separately; the export cannot reliably detect these. In Firefox/Zen also include
the Graphics section from `about:support` (WebGL renderer and Compositing).
Masked renderer strings may not identify the actual GPU. Keep recordings and
DevTools-heavy traces separate from an unrecorded visual check.

Local Firefox comparisons can reuse the soak command with
`PROFILE_BROWSER=firefox PROFILE_DEVICE=desktop PROFILE_HEADED=1`. Record
headless/headed explicitly: October 3 testing showed materially different frame
delivery between them on the same Linux machine. Neither establishes Windows
Zen or battery-saving performance.
