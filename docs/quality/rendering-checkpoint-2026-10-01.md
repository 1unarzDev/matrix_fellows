# Rendering checkpoint — October 1, 2026

## Build and scope

Candidate is based on `8dbcf7e`, with the renderer changes in this checkpoint.
Production at the start of this cycle was Cloudflare version
`d8861132-a5f8-49ce-a92a-bf819c2f8781` (October 1, 05:10 UTC).
Production has not been replaced. The isolated baseline checkout is
`/tmp/matrix-render-baseline-8dbcf7e`; both comparisons use production builds.
Installed rendering dependencies: Three r180, Lenis 1.3.26, GSAP 3.15.0.
Candidate Cloudflare version: `afbd3f09-e6bf-4494-9c52-3f9aa9b6605b`.
[Device-test preview](https://rendering-oct01-matrix-fellows.lunarzdev.workers.dev).
Upload is not a production traffic deployment. No backend change was necessary.

## Findings and implementation

- Scroll rebuilt and dirtied 38 rock and 640 reed instance matrices despite
  invariant placement. Initialize once; shader wind and reversible reveals remain.
  The actual oasis regression test failed before the fix and passes afterward.
- Both pointer paths now queue the freshest camera progress for one scene update.
  Removed the extra 75 ms touch settlement; active frames target 60, idle 30.
  DOM scrolling is not capped. Parent progress publication now changes only at
  the thresholds its consumers actually need; repeated transforms/accent writes
  are avoided. No global GSAP ticker cap or lag-smoothing modification.
- Mobile previously started at .4× procedural resolution, 1.7× foreground,
  reduced detail and 1,560 drawn particles. Candidate starts at 1× procedural,
  native foreground up to DPR 3, full detail, 12,000 particles. Resolution can
  recover, with asynchronous GPU capacity guarding promotion. Desktop quality
  changes now resize the real composer/renderer together.
- Efficient foliage no longer requests ineffective alpha-to-coverage on a
  non-MSAA canvas or grain-producing alpha hashing. Continuous fade and derivative
  cutout coverage preserve wind and clipping. All particle shapes receive edge
  coverage; constellation lines use analytic screen-space ribbons.
- Stable `lvh` canvas sizing and actual bounds/DPR-based projection replace the
  tablet `dvh`/ignored-height-resize mismatch. Physical browser toolbar behavior
  still needs testing. DPR and reduced-motion reentry caches were corrected.
- Bounded opt-in measurements distinguish raw RAF, CPU update, CPU draw
  submission, asynchronous GPU queries, actual buffers and progress backlog.
  Normal GPU sampling is at most 2 Hz, without trace retention. No synchronous
  production GPU readbacks. Debug drawing pause keeps the canvas/layout intact.

## Measured comparisons

Chromium iPhone 13 emulation, 390×844 CSS, DPR 3. RTX 4070 Ti SUPER hardware
and SwiftShader software are separate environments; neither is an actual iPhone.
Power mode is unavailable. New scene submissions are **not verified screen
presentations**. Trace scrolls beginning→community, 20 seconds each direction.

| Production-build run               | Active ten-second windows         | Quality                                                         | Interval p95/p99 and spikes                        |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Baseline `8dbcf7e`, hardware, 30 s | 29.5 / 29.9 / 30 fps              | .4× source, 1.7× foreground, reduced detail/1,560 points        | p95 33.4 ms; one 116.7 ms spike                    |
| Candidate hardware, 120 s          | 60 fps in 11 windows; 57.7 in one | 1→1.25→1.5625× source; 3× foreground; full detail/12,000 points | p95/p99 ≤16.8 ms each window; one 316.6 ms gap     |
| Candidate SwiftShader, 30 s        | 4.8 / 6.8 / 7.7 fps               | 1× source; 3× foreground; full detail/12,000 points             | p95 250 /183.3 /150.1 ms; recurring >100 ms stalls |

Hardware candidate: overall 59.81 fps, scene-update p95 .1 ms, CPU submission
p95 .3 ms, asynchronous GPU p95 4.94 ms, consumed-progress backlog p95 zero.
Request age p95 9.4–10.9 ms per window does not include complete physical-input
latency. The isolated 316.6 ms gap failed the every-window 58 fps gate; there was
no quality event at that point or observed blocking long task. A corresponding
310.8 ms long animation frame had zero reported blocking time. Cause is not
established. Do not dismiss it as solved or equate average FPS with smoothness.
There were approximately 22 fewer submissions than an ideal 7,200 at 60 Hz;
this is not a measured count of compositor presentation misses. By camera-stage
bucket, interval p95/p99 stayed ≤16.8 ms for all five cinematic chapters. The
beginning bucket includes the 316.6 ms gap, oasis maximum was 66.7 ms, and later
chapter maxima were 16.8 ms. Maximum sampled request age was 22.2 ms.

The software regression is severe and unresolved. Higher resolution and restored
detail were changed simultaneously with cadence; this is not a same-quality
performance win. An earlier invariant-only software comparison also did not
establish an FPS gain (19–23.4 versus 24.7–30 in separate noisy runs). Static
buffer upload elimination is proven, but its end-to-end gain is not.

Historical report reconciliation: the final historical 120-second software run
was 28.31 fps overall, oasis windows 26.3–26.8, failing its 28 fps gate. Earlier
better passages describe other runs. The old approximately 10 fps phone report
is historically unresolved; current owner feedback is qualitative, not another
10 fps measurement. The actual loader reveal is 900 ms, not the older documented
300 ms. Historical reports have not been rewritten.

## Rejected experiment

A bounded immutable half-float terrain lookup retained exact near-hit checks.
Interpolation tests passed but the software oasis shader benchmark worsened:
exact 23.35 ms median, cached 40.275 ms. Removed the prototype and runtime wiring.
Do not assume texture caching is cheaper than arithmetic on this pipeline.

## Verification and artifacts

- Typecheck and production build pass; 155 unit tests pass.
- Four new browser integration tests pass across desktop/mobile emulation:
  actual buffer/pass/uniform/draw-range changes and recovery, coalescing, resize
  aspect, and profile teardown on route navigation.
- Descent render has no dark-frame discontinuity; terrain-depth fixtures pass;
  waterline shader check passes 804 samples. Its standalone WebGL1 harness now
  enables derivatives required by the current world shader (production is WebGL2).
- Resource-atmosphere test fails because its queried node is absent, on both
  this candidate and isolated baseline. This is not attributed to renderer changes.
- Clean mobile rerun: 14 passed, 3 intentionally skipped. High-density iPhone/iPad
  browser test passes separately. Desktop scroll-assistance checks passed in the
  broader run. The first broad run was invalidated in part by a build restarting
  the preview server and shared Playwright artifact output; those checks were rerun.
- Three-second research→depths hardware DOM probe: 34 layouts / 6.66 ms total,
  562 style recalculations / 422.99 ms total, 865.37 ms total task duration.
  RAF p95 16.7 ms. This is not evidence that DOM work is negligible; paint/layer
  area and compositor tracing remain open. Paused drawing retains canvas/layout.
  Identical baseline probe: 35 layouts / 6.72 ms, 566 style recalculations /
  466.92 ms, 895.17 ms task duration, RAF p95 16.7 ms. Candidate drawing-paused
  control: 404.83 ms style time and 821.48 ms task time. This single comparison
  suggests modest DOM savings, not proof of a complete main-thread fix.
- Oasis reveal check passes, retaining scene color/edge progression. Matched
  mobile-visual captures pass foreground density and trunk/foliage assertions.
- Repeatable measurements: `scripts/mobile-soak.mjs`, `PROFILE_DURATION_MS`,
  `PROFILE_GPU`, `PROFILE_OUTPUT`. Generated traces are in
  `/tmp/matrix-final-{hardware,software}.json` on this workstation.
- Matched scene/time/resolution references use the existing mobile-visual script
  with `PROFILE_GPU=hardware PROFILE_REFERENCE=1`. PNGs under
  `test-results/mobile-visual-quality/` compare initial and native procedural
  resolutions for ridges, palms, rain, water, caustics and cosmos on iPhone/iPad
  emulation. These are stills, not evidence of physical-device motion quality.
  Matched oasis views retain palms/trunks and density, while native procedural
  water visibly resolves finer highlights and shoreline edges than the 1× source.
  Initial 1× procedural reconstruction is still softer than native reference;
  adaptive ratios do not guarantee reference detail on constrained devices.

## Remaining work / next experiment

Do not production-roll out on the strength of desktop emulation. Test the affected
phones, iPad Safari, Android and integrated-GPU/battery-saving laptop using the
[physical procedure](physical-device-performance-procedure.md), including thermal
soak, toolbar changes, orientation, background/resume and unrecorded motion.
No physical devices were available this cycle; no power-mode/context-hint comparison
or verified compositor presentation measurement has been completed.

Next bounded experiment: isolate procedural fragment/depth reconstruction cost
from native foreground overdraw at identical seed, camera and time. Benchmark
shared/hoisted terrain and swell calculations with image-difference checks,
rather than lowering loop ceilings, density or resolution. Reinvest savings in
source sharpness. Reproduce the isolated hardware callback gap with CDP tracing
and inspect style/layout/paint/composite around it before attributing a cause.
