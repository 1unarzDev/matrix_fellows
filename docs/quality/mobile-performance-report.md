# Mobile rendering follow-up — 2026-09-22

This report records controlled lab measurements, not physical-iPhone results.
The regression command is `npm run perf:mobile` against a production preview:
a six-second `#research` → `#frontiers` scroll at an iPhone 13 viewport using
SwiftShader. It records RAF median/p95, rendered FPS, current quality ratios,
draw statistics, and browser/shader errors. Its p95 budget is 50 ms.

## Result

| Production path                       | RAF median |      RAF p95 | Callbacks | Canvas FPS | Result     |
| ------------------------------------- | ---------: | -----------: | --------: | ---------: | ---------- |
| Previous mobile 2× MSAA + FXAA        |    66.6 ms |      83.4 ms |        94 |       16.9 | Fail       |
| First pass without mobile MSAA        |    16.7 ms |      33.4 ms |       271 |       30.0 | Proxy pass |
| Current efficient path (three trials) |    16.7 ms | 16.7–16.8 ms |       361 |       30.0 | Proxy pass |

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

## Focused refinement follow-up

The nebula/loading refinement retained the same efficient quality floor and did
not add a render pass, target, particle buffer, or FBM octave. The six-second
SwiftShader mobile transition again reported 30.0 rendered fps at a 0.32
atmosphere ratio and 1× foreground, with a 16.7 ms browser-RAF p95. The isolated
storm/ocean shader measured 31.4 ms median / 34.3 ms p95 under SwiftShader; the
cosmic additions are gated outside that chapter.

A four-times CPU-throttled, 150 ms latency / 1.5 Mbps production-build run kept
SSR content and the new meeting summary usable immediately after DOM readiness.
Early mobile navigation responded in 96 ms. The cold scene became usable in
6.83 s and a warm reload in 1.85 s; shader preparation accounted for 2.94 s of
the cold throttled run. Six long tasks totaled 1,081 ms, including one 575 ms
task. This is a deliberately severe desktop emulation result, not an iPhone
claim, and it shows why the loader was simplified instead of trying to conceal
startup work with another animated canvas.

The static preview now yields through one 300 ms scene reveal. A normal
production SwiftShader profile recorded LCP at 236 ms, first-scene time 461 ms
from cinematic component mount, 20 ms synchronous world construction, and
106 ms asynchronous shader preparation in that run. Natural run-to-run and
cold-cache variance applies. The owner's approximately 10 fps physical-phone
baseline remains unresolved pending retest of the deployed build.

The final 120-second hardware-accelerated mobile-emulation soak rendered 3,600
frames at 30.00 fps. Rendered-frame median/p95 were 33.3/33.4 ms, the maximum
interval was 50 ms, and there were no stalls above 100 ms in any ten-second
window. GPU timer-query p95 was 1.97 ms on the RTX 4070 Ti SUPER; this confirms
the added cosmic motion is inexpensive on that GPU, not that a phone will match
it. The deterministic cosmic clock produced five isolated streak events during
the forward/reverse journey and paused while outside its chapter.

## Current-worktree acceptance rerun

The complete local matrix was rerun against the production Cloudflare Worker
build after the guide library and footer changes, so the results describe the
current worktree rather than an earlier renderer-only checkout.

- Three identical SwiftShader `perf:mobile` trials each reported 30.0 canvas fps,
  361 RAF callbacks, 16.7 ms median, and 16.7–16.8 ms RAF p95. All used the
  efficient profile, 0.32 atmosphere ratio, 1× foreground, five draw calls, ten
  programs, and 1,560 initial particles.
- The 120-second SwiftShader forward/reverse soak rendered 3,549 frames at 29.57
  fps overall. Every ten-second window measured 29.1–30.0 fps with rendered p95
  at or below 50 ms. Overall rendered median/p95 were 33.3/33.4 ms; the maximum
  interval was 66.7 ms and there were no intervals above 100 ms. CPU submission
  p95 was 0.30 ms. GPU timing was unavailable and was not inferred.
- Both bounded quality steps occurred during the soak: particles fell first to
  1,248 and then 1,196 while the atmosphere remained at its 0.32 floor. No
  compilation or allocation stall accompanied either event. The worst frame was
  in the oasis range at progress 1.178 with 18 calls and a 66.7 ms interval.
- Sampled mobile-navigation tap-to-paint was 29.9 ms, below the 200 ms lab target.
- Normal/paused-WebGL profiling recorded 16.7–16.8 ms RAF p95 in both controls.
  Normal mode adapted to quality step 2 during the three-second journey; startup
  produced two long tasks totaling 666 ms. This distinguishes startup work from
  steady-state scroll choreography without pretending RAF is rendered cadence.
- The isolated production storm/ocean fragment measured 31.7 ms median and 33.0
  ms p95 over eight SwiftShader samples.
- With 4× CPU throttling, 150 ms network latency, and 1.5 Mbps throughput, SSR
  content remained available at DOM readiness. Early navigation responded in
  40.7 ms; cold usable scene time was 7.68 s and warm usable time was 1.80 s.
  Six long tasks included a 573 ms shader-preparation task. These startup figures
  are reported separately from the warmed 120-second journey.
- Hardware-accelerated desktop and mobile-emulated captures held 30.0 fps at all
  six chapters. Desktop retained the cinematic profile and 12,000 particles;
  mobile emulation retained the efficient 0.32-atmosphere/1×-foreground path.
- The current-worktree 120-second hardware-accelerated mobile-emulation soak
  rendered 3,600 frames at 30.00 fps, with every ten-second window at 30.0 fps,
  33.3/33.4 ms rendered median/p95, a 33.5 ms maximum interval, and no >100 ms
  stalls. `EXT_disjoint_timer_query_webgl2` returned 3,599 valid samples with
  1.26 ms GPU p95 and zero rejected/disjoint samples. CPU submission p95 was
  0.30 ms and sampled tap-to-paint was 29.2 ms. This describes the available RTX
  4070 Ti SUPER, not a phone GPU.
- Hero water (24 samples), waterline NaNs (804 samples), descent continuity (81
  frames), terrain depth, all eight oasis assets, reverse navigation, context
  loss, teardown, toolbar resize, and 844×390 landscape initialization passed.

These results close the actionable local acceptance checks, not the physical
device requirement. Follow the [physical-device procedure](physical-device-performance-procedure.md)
on the owner's phone and representative iOS/Android hardware before calling the
approximately 10 fps report resolved.

## Mobile edge, palm, and nebula follow-up

An iPhone/iPad visual reproduction found that the efficient foreground was held
to one CSS pixel while Retina device ratios were 2–3×. The atmosphere was also
enlarged directly from its 0.32× target. The revised path caps foreground
supersampling at 1.25× and reconstructs only the low-resolution atmosphere with
four bicubic taps. It does not restore the older mobile MSAA target. The former
five-tap final edge blur was removed because it duplicated filtering and softened
the supersampled geometry.

The palm GLB contains two trunk and two foliage primitives. The earlier one-mesh
instancing conversion retained only the final foliage primitive. The complete
asset is now transformed, merged with a per-vertex part marker, and instanced in
one draw; mobile diagnostics confirm two trunk and two foliage source parts while
the oasis peak remains 18 calls.

The meteor formerly ran inside the 0.32× atmosphere target, where its narrow line
collapsed into a blurred gray capsule during enlargement. It now uses the existing
full-resolution grade pass, with a compact head, tapered core, and restrained
local veil. No pass, target, simulation, or animation loop was added.

The focused iPhone/iPad visual check reports a 1.25 foreground ratio and complete
palm parts at both sizes. A 30-second SwiftShader rendered-cadence run passed all
three ten-second windows at 28.2, 30.0, and 30.0 fps; rendered p95 was at most
50 ms with no stalls over 100 ms. `perf:mobile` remained capped at roughly 30 fps
with 16.8 ms RAF p95. These remain desktop proxies, not physical Safari evidence.

## Retina resolution follow-up — 2026-09-23

A new regression reproduced the reported softness with the actual efficient path:
an emulated iPhone 13 (`devicePixelRatio: 3`) and iPad Pro 11 (`devicePixelRatio: 2`)
both received only a 1.25× foreground drawing buffer. That is roughly 17% and 39%
of their respective physical pixel counts. The efficient foreground cap is now
1.5× while the expensive procedural atmosphere remains at 0.32×. This is bounded
supersampling, not a return to the older mobile MSAA configuration.

The atmosphere copy now blends its stable four-tap B-spline reconstruction with
one hardware-filtered source sample. The blend restores more local contrast during
the ocean range without another world evaluation, render target, pass, or draw
call. Particle sprites retain their soft halo but add a compact resolved center,
so motes and stars no longer read as uniformly blurred discs at Retina density.

Three controlled SwiftShader transitions each reported 30.0 rendered fps with the
1.5× foreground, 0.32× atmosphere, five draw calls, and the existing particle
adaptation. Browser RAF p95 ranged from 16.7 to 33.3 ms, within the 50 ms gate.
This verifies the quality policy and local regression only; physical iPhone/iPad
Safari image quality, thermal behavior, and sustained cadence remain outstanding.

## Dune and rain edge follow-up — 2026-09-23

Phone and tablet captures reproduced two distinct forms of aliasing. The desert
ridge and procedural weather shared the efficient atmosphere target, where the
0.32× source made each sample span more than three CSS pixels. Foreground rain
sprites used the 1.5× target but ended in a hard fragment discard around a core
that could be close to one framebuffer pixel wide.

The efficient atmosphere keeps its measured 0.32× target, four-tap reconstruction,
no MSAA, and no additional pass. The opening ridge no longer mixes a sharp sample
from that coarse source back over the reconstruction; local contrast returns as
the camera clears the silhouette. Rain sprites remain in the 1.5× foreground and
now use derivative-based edge coverage with a slightly wider resolved core. Both
global and opening-only 0.5× prototypes were rejected after their first 30-second
soak windows fell to 21.8 and 25.4 fps respectively. These are emulated-device
checks. The focused mobile transition passed at 30 rendered fps with 33.2 ms RAF
p95. The 30-second SwiftShader journey still missed its stricter first-window
gate at 26.3 fps (later windows were 30 fps), so that extended proxy remains a
failed check. Physical Safari quality, thermal behavior, and sustained cadence
remain unverified.

## Direct mobile composite and Retina revision — 2026-09-23

The previous follow-up improved a 1.25× regression to 1.5×, but new iPhone and
iPad screenshots still showed that the Three.js layer was materially softer than
the DOM above it. Instrumented captures confirmed two remaining causes: a 3×
iPhone was receiving only a 1.5× foreground buffer, and the procedural world was
still sampled at 0.32× CSS resolution. Raising the existing composer to 2× fell
to 24.6 rendered fps in the focused SwiftShader transition, so MSAA or a larger
version of the same pipeline was not viable.

The efficient path now reconstructs and grades its half-float atmosphere target
directly into the canvas, writes the sampled terrain depth, and draws foreground
geometry into that depth buffer. Removing the full-resolution half-float
composer plus final grade readback reduced the mobile path from five to four draw
calls. That bandwidth saving funds a 1.7× foreground and a 0.4× atmosphere
floor. The cinematic desktop composer, bloom, and MSAA path are unchanged.

The deterministic iPhone/iPad capture gate now checks both independent scales.
It observed a 663-pixel drawing buffer across a 390-CSS-pixel iPhone viewport,
a 1,377-pixel buffer across an 810-CSS-pixel iPad viewport, a 0.4 atmosphere
ratio on both, and complete palm trunk/foliage batches. The focused emulated
mobile transition reported 30.0 rendered fps, 33.3 ms RAF p95, four draw calls,
and the bounded 1,196-particle adaptive floor without lowering either render
ratio. These are
local Chromium/SwiftShader results; physical iPhone/iPad Safari image quality,
thermal behavior, and sustained cadence remain outstanding.

The final 120-second software-GPU forward/reverse soak averaged 28.31 rendered
fps with a 50 ms rendered-frame p95 and no stalls over 100 ms. Six ten-second
windows held 30 fps; the six oasis-facing windows ranged from 26.3 to 26.8 fps.
The strict requirement that every window reach 28 fps therefore remains failed,
matching the pre-existing 26.3 fps first-window miss recorded above rather than
introducing a new regression. The focused ocean transition remains at 30 fps.
