# Mobile rendering follow-up — 2026-09-22

This report records controlled lab measurements, not physical-iPhone results.
The regression command is `npm run perf:mobile` against a production preview:
a six-second `#research` → `#frontiers` scroll at an iPhone 13 viewport using
SwiftShader. It records RAF median/p95, rendered FPS, current quality ratios,
draw statistics, and browser/shader errors. Its p95 budget is 50 ms.

## Result

| Production path                | RAF median | RAF p95 | Callbacks | Canvas FPS | Result |
| ------------------------------ | ---------: | ------: | --------: | ---------: | ------ |
| Previous mobile 2× MSAA + FXAA |    66.6 ms | 83.4 ms |        94 |       16.9 | Fail   |
| First pass without mobile MSAA |    16.7 ms | 33.4 ms |       271 |       30.0 | Proxy pass |
| Current efficient path (three trials) | 16.7 ms | 16.7–16.8 ms | 361 | 30.0 | Proxy pass |

The first improvement came from removing the mobile composer's redundant 2×
multisample render target. The foreground was already followed by FXAA, so the
old path paid a full-screen half-float multisample resolve and then performed a
second edge treatment.

The owner's physical phone subsequently measured roughly **10 fps**, overriding
the optimistic desktop proxy as the failing baseline. The second pass decoupled
render quality from viewport width, starts coarse-pointer devices at a 0.32
atmosphere ratio with a full-resolution foreground, combines edge treatment and
grading into one pass, reduces procedural detail, and initially draws 1,560 of
2,600 buffered particles. Sustained pressure can reduce that range to 1,196
without reallocating buffers.

The oasis reveal was a separate first-use hitch. Profiling located a 350 ms frame
at progress 0.292 with 72 draw calls. Palm instancing reduced the peak to 18
calls, and asset shaders, buffers, textures, and the full-size framebuffer warm
behind the arrival cover. The same short trace then had a 50.1 ms maximum.

`npm run perf:soak` recorded actual rendered frames for 120 seconds of repeated
forward/reverse travel: 29.49 fps overall, 33.3 ms median, 33.5 ms p95, no >100 ms
stalls, and 0.30 ms CPU-submission p95. Every ten-second window measured 28.9–30
fps with p95 at or below 50 ms. Async GPU timing was unavailable under
SwiftShader and is reported as unavailable rather than inferred.

Hardware-accelerated captures on an RTX 4070 Ti SUPER stayed at the intentional
30 fps cap before and after. Chapter captures retain the six compositions and
the foreground's capped 1 CSS-pixel ratio. The efficient atmosphere is
deliberately softer. Desktop retains up to 4× MSAA, multi-mip bloom, full shader
detail, and 12,000 particles.

## Attribution and rejected changes

`npm run perf:profile` compares the normal journey with a paused-WebGL control.
Before the MSAA change, the SwiftShader normal path measured 66.7 ms median /
83.4 ms p95, while hiding the canvas restored 16.7 ms / 16.7 ms. This ruled out
the DOM/ScrollTrigger choreography as the steady-state cause.

`npm run perf:shader` then isolated the production world fragment at the storm
hot spot. Removing all foreground water was much faster but visually invalid;
removing reflection gained about 10% and removing swell tracing about 16%, also
with unacceptable visual changes. A bounded 192-step swell-intersection rewrite
gained only about 3% and risked horizon gaps, so it was reverted. The accepted
change targeted measured render-target bandwidth without simplifying the water.

## Other improvements in this pass

- Mobile/coarse-pointer layouts no longer import or initialize Lenis; native
  touch inertia remains the owner of scroll.
- The world module downloads in parallel with GSAP initialization rather than
  waiting behind font/layout work.
- DM Sans and Manrope are build-time self-hosted variable WOFF2 assets with
  metric-adjusted fallbacks. Only their critical 400/500 faces gate layout.
- World and foreground materials compile asynchronously behind the arrival veil.
- Layout width no longer chooses renderer quality; landscape phones remain on
  the efficient path while capable fine-pointer desktops retain cinematic quality.
- Canvas diagnostics now expose compile state/time, program count, draw calls,
  triangles, and points in addition to frame and quality data.

## Server measurement

The validated public-content aggregation now uses a Nitro cached function. In a
fresh local Cloudflare Worker isolate, `/api/content` took 766 ms on the initial
Supabase miss and roughly 4.5–5.5 ms on the next four requests. With content
warm, homepage TTFB measured roughly 11–12 ms. Nitro's default storage is
isolate-local memory, so this does not claim a global Cloudflare hit ratio.
Failures remain `no-store` and are thrown outside the successful cache value.

## Remaining verification

The owner's pre-pass physical result of roughly 10 fps is the authoritative
failure report, but the optimized build has not yet been measured there.
Physical Safari testing remains required on a recent and an older/midrange
iPhone, in normal and Low Power Mode, including a 60–120 second soak for thermal
behavior. Lab emulation cannot prove iOS GPU timing, battery use, or Safari's
compositor behavior. Adaptive quality also remains intentionally one-way within
a session and may be revisited only with physical-device evidence.
