# Mobile rendering follow-up — 2026-09-19

This report records controlled lab measurements, not physical-iPhone results.
The regression command is `npm run perf:mobile` against a production preview:
a six-second `#research` → `#frontiers` scroll at an iPhone 13 viewport using
SwiftShader. It records RAF median/p95, rendered FPS, current quality ratios,
draw statistics, and browser/shader errors. Its p95 budget is 50 ms.

## Result

| Production path                | RAF median | RAF p95 | Callbacks | Canvas FPS | Result |
| ------------------------------ | ---------: | ------: | --------: | ---------: | ------ |
| Previous mobile 2× MSAA + FXAA |    66.6 ms | 83.4 ms |        94 |       16.9 | Fail   |
| Current mobile FXAA            |    16.7 ms | 33.4 ms |       271 |       30.0 | Pass   |

The current run used the same full-resolution foreground, adaptive atmosphere
floor (`0.45`), 1,502 active particles after degradation, and storm/ocean scroll
range. The improvement came from removing the mobile composer's redundant 2×
multisample render target. The foreground was already followed by FXAA, so the
old path paid a full-screen half-float multisample resolve and then performed a
second edge treatment.

Hardware-accelerated captures on an RTX 4070 Ti SUPER stayed at the intentional
30 fps cap before and after. Side-by-side mobile chapter captures found no
material silhouette or composition regression; FXAA and the foreground's capped
1 CSS-pixel ratio remain active. Desktop retains up to 4× MSAA and is unchanged.

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

Physical Safari testing remains required on a recent and an older/midrange
iPhone, in normal and Low Power Mode, including a 60–120 second soak for thermal
behavior. Lab emulation cannot prove iOS GPU timing, battery use, or Safari's
compositor behavior. Adaptive quality also remains intentionally one-way within
a session and may be revisited only with physical-device evidence.
