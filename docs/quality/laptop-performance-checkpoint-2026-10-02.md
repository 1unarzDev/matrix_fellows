# Laptop-first checkpoint — October 2, 2026

### October 3 full-document sustained check

The existing soak stops at `#community`; it omitted the remaining calendar/join
tail. `PROFILE_SCROLL_EXTENT=page` now optionally drives to the actual document
end, with the old trace preserved by default and the extent recorded in the
report. This is profiling-script coverage, not shipped rendering changes.

Build `8d6b01b4`, same Linux/RTX host, visible Firefox, 1440×900/DPR 2,
120-second full-page forward/reverse journey: all 12 windows at 60 scene
submissions/sec, p95 17.08/p99 17.12/max 17.14 ms, zero >100 ms stalls or errors.
3,141 frames had clamped camera progress 5; the tail remains at active cadence.
Full 2880×1800 source/foreground, MSAA 4, bloom/full detail/12,000 particles;
no quality changes. GPU queries unavailable, CPU submission p95 1 ms (Firefox
timer precision). Trace `/tmp/matrix-page-firefox-soak.json`.
Command: `TEST_BASE_URL=http://127.0.0.1:8789 PROFILE_GPU=hardware
PROFILE_DEVICE=desktop PROFILE_BROWSER=firefox PROFILE_HEADED=1
PROFILE_SCROLL_EXTENT=page PROFILE_DURATION_MS=120000
PROFILE_OUTPUT=/tmp/matrix-page-firefox-soak.json node scripts/mobile-soak.mjs`.
This changes chapter/window distribution versus older community-only traces;
it is sustained regression evidence, not a matched before/after speed gain or
Windows/Zen/power/physical-presentation validation.

Same-build Chromium phone emulation, 390×844/DPR 3, 120-second full-page trace:
all 12 windows at 60 submissions/sec, p95 16.7/p99/max 16.8 ms, no >100 ms
stalls or errors. Native 1170×2532 foreground/full detail/12,000 particles;
source recovered 1→1.25→1.5625→1.953125 (final 762×1648), not fixed-quality
timing or native procedural output. Async GPU p95 3.332 ms, CPU update/submission
p95 0.1/0.2 ms; 3,745 frames at clamped progress 5. Trace
`/tmp/matrix-page-mobile-soak.json`. Reuse the command above without Firefox/headed
flags and with `PROFILE_DEVICE=mobile` and the corresponding output path.
Physical iPhone/iPad/Android and affected-laptop conditions remain unverified.

A visible Firefox second-page/bring-to-front resume probe was inconclusive:
the original document still reported `hidden=false`. It did not verify a real
background/resume cycle and justifies no shipped behavior change. Actual-device
background/resume remains part of the open device procedure.

### October 3 follow-up verification and rejected experiment

Build `8d6b01b4` final-section cadence regression now covers both Chromium desktop
and phone emulation, and asserts camera progress remains exactly 5 with no extra
camera updates while the document moves. Both pass; visible Firefox desktop
passes the same regression (1 test). This expands regression
coverage, not physical iPhone evidence. Preview/runtime are unchanged.

Tested a temporary surface-only shader specialization for progress 1.06–1.42:
compile-time zero dive/cosmos/submerged/edge, retaining the changing weather,
flood, water and sun-cloud fields. Existing shader benchmark at full detail,
time 8, aspect 1.6: 780×1688/progress 1.25 median synchronized draw/readback
0.650 ms baseline versus 0.675 ms prototype. Three interleaved 1560×3376/progress
1.35 runs: baseline medians 2.875/2.775/2.900 ms, prototype 2.750/2.775/2.750 ms;
p95 ranges 4.275–4.425 versus 4.225–4.350 ms. Identical image fingerprints in
those views only. These are synthetic-size isolated-shader synchronized timings,
not async GPU timing, laptop viewport tests, presentation or motion proof.
Overlapping results do not justify another program/compile path. Rejected;
temporary benchmark variant removed, shipped shader unchanged.

`lspci` and `/dev/dri` confirm only the RTX 4070 Ti SUPER is available; no local
integrated GPU. Affected Windows/Zen power-mode and device comparisons remain
the primary unresolved gate. Do not infer their failure cause from this host.

## October 3 follow-up — document-motion cadence

Owner confirms the affected Legion used Windows/Zen, probably battery saver;
normal-power and same-laptop preview comparisons remain unavailable. No adapter
or operating-system cadence restriction has been established.

Reproduced another scheduling defect in the real page: the document continues
well past the final camera chapter, but only camera-progress changes marked
activity. A slow 628-pixel final-section scroll selected 30 fps despite motion.
The new browser regression failed on build `79c95887` before the fix. The existing
progress call now carries a cached document-movement boolean; cadence activity
is separate from camera-request age, preserving lag metrics and avoiding new
listeners, layout reads, camera work or UI throttling. No quality, effects,
resolution, pass structure or smoothing changes. Stopped scrolling still returns
to 30 fps idle. This fixes an application defect, not evidence of Legion success.

164 unit tests, typecheck and production build pass. Desktop laptop-rendering
suite: 5 passed, 1 intentional skip, including the previously failing real-page
cadence regression, strict visual equivalence, wheel routing and buffer tests.
Mobile suite: 1 passed, 5 intentional skips (secondary-pointer preservation).
Commands: `TEST_BASE_URL=http://127.0.0.1:8789 PROFILE_GPU=hardware npx playwright
test tests/e2e/laptop-rendering.spec.ts --project=desktop --workers=1`, repeated
with `--project=mobile`. These are local Chromium regression checks, not physical
device/presentation verification or a new matched GPU performance claim.

Current preview at <https://laptop-fidelity-oct03-matrix-fellows.lunarzdev.workers.dev>
is version `bf294091-465e-4486-8be0-7c65ad78dc4f`, Nuxt build
`8d6b01b4-000e-4ca7-a9ab-f3c60dccf3d5`; remote build identity checked.
Preview-only upload, no production traffic deployment. Earlier measurements below
remain specific to their builds. Next primary gate: same Legion normal/battery
saver comparisons on this preview and live production, with adapter/refresh and
profile export. Android/iPad, integrated-GPU, thermal and presentation gaps remain.

## October 3 final fidelity gate — supersedes candidate below

### Balanced-jitter clock correction — current candidate

Previous goal turn yielded engine-isolation evidence. This turn reproduced an
application pacing defect with `npx vitest run tests/unit/frame-clock.test.ts`:
balanced matching-rate early/late callbacks fail before the correction. The old
fixed 1 ms grace skips matching callbacks. The corrected clock retains nominal
phase with 15% grace; the existing steady slightly-early case now requires the
**raw** interval to match within 0.8%, not elapsed time since the last submission.
No animation timestamp, cadence target, shader, buffer ratio, pass or UI ticker
changes. No power-mode inference or UA rule.

Synthetic ten-second loop, exact matching average cadence with alternating 10%
early callbacks (not hardware/device measurements):

| Target/callback cadence | Old submissions | Corrected submissions | Old/new maximum interval |
| --- | --- | --- | --- |
| 30 Hz | 228 | 300 | 66.67 / 36.67 ms |
| 60 Hz | 378 | 600 | 33.33 / 18.33 ms |

Tests also sweep every integer callback cadence 20–240 Hz for ten synthetic
seconds at 30/60 targets, requiring available delivery below budget and bounded
delivery above it. A first widened-grace prototype retained a high-refresh drift
defect; rejected before browser testing. Final focused tests: 7 passing; full
unit suite: 164 passing; typecheck passes. Physical Windows/Zen/battery-saver
benefit remains unverified; this corrects a demonstrable portable clock defect,
not the complete laptop workload problem.

Implementation commits `444af4b` and `5dd175a`, including the independent committed reveal/UI
fixes `2870249` and `26f3546`. Isolated checkout
`/tmp/matrix-clock-verify.XzfGj6`; generated Nuxt directory overridden **only in
that checkout** to avoid symlinked dependency-cache paths. Initial isolated build
failed prerender import resolution; explicit isolated build directory fixed it.
Final production build passes, Nuxt ID `79c95887-df10-4b0d-a940-4abc4127fa21`
(initial candidate was `608c94d5-821c-45a6-a677-f9c12bae2fe6`). Local production
server `http://127.0.0.1:8788`. Final preview version
`6fe726fb-1e3c-44ec-b49a-71e42594c0ca` at
<https://laptop-fidelity-oct03-matrix-fellows.lunarzdev.workers.dev> supersedes
the earlier preview versions below. Deployment list still identifies live
production as `16fe788b-1ec9-40a2-a71a-25d0e3d77a6b`; no traffic deployment.

Real-renderer regression injects monotonic, phase-aligned balanced timestamps
without discarding native callbacks or shipping any override. Old local build
`c2d00a0c-6f4e-4912-b5b2-223a308adccf` fails: 76.03% of available callbacks
submit scenes. Corrected build passes the unchanged >=97% gate in three Chromium
repeats and visible Firefox. These are **synthetic clock inputs**, not a physical
display/cadence result. Frame quality ratios, full detail, bloom and 12,000
particles are asserted unchanged in the test.

Final broad browser suite: 49 passed, 17 intentional skips. First run had a
max-delta-30 image failure; investigation found the ready class does not mean
the 900 ms CSS fade has finished (observed opacity 0.989101 before capture versus
1 afterward). Frozen comparisons now require computed opacity 1. Three isolated
HiDPI image repeats and the broad rerun pass, with original image thresholds.
This fixes capture readiness, not the shipped fade or rendering appearance.
Visible Firefox suite: 4 passed, 1 mobile-only skip; final jitter fixture repeated
separately after enforcing monotonic timestamps. Artifacts
`/tmp/matrix-clock-{final-e2e,visual-repeat,browser-red-final,browser-green-final,firefox-e2e,firefox-jitter-final}`.

| Lab journey, same available RTX host | Window submissions/sec | p95 / p99 | Maximum | >100 ms stalls |
| --- | --- | --- | --- | --- |
| Chromium desktop, 120 s | all 12 at 60 | 16.8 / 16.8 ms | 16.8 ms | 0 |
| Chromium phone emulation, 120 s | 59.9–60 | 16.7 / 16.8 ms | 33.4 ms | 0 |
| Visible Firefox desktop, 30 s | 60 / 60 / 60 | 17.10 / 17.12 ms | 17.16 ms | 0 |

Desktop stays 2880×1800 source/foreground, MSAA 4, bloom/full detail/12k particles,
no quality transitions; asynchronous GPU p95 6.626 ms, CPU update/submission p95
0.1/0.3 ms. Phone stays native 1170×2532 foreground/full detail/12k; source
recovers 1→1.25→1.5625→1.953125, final 762×1648; GPU p95 4.683 ms,
CPU update/submission p95 0.1/0.2 ms. That is a simultaneous source-quality
change relative to prior traces, not a matched-quality speedup claim or native
procedural resolution. Firefox GPU queries unavailable; no quality transitions.
No browser errors. `/tmp/matrix-clock-{desktop-soak,mobile-soak,firefox-headed}.json`.

Next bounded local check: actual scrolling after the camera progression clamps
at the final chapter. The current activity marker changes only with camera
progress; test whether that incorrectly selects idle cadence while the document
still moves before changing it. The primary external gate remains the owner's
Windows/Zen/Legion normal/battery-saving exports and visual check. Android/iPad
physical performance and thermal/presentation evidence remain open. Goal not complete.

### Subsequent Firefox delivery isolation

Previous goal turn made implementation/test progress (`fcb7f65`); this turn adds
matched engine evidence. Existing soak now accepts `PROFILE_BROWSER=firefox` and
`PROFILE_HEADED=1`, records both and uses the Firefox desktop descriptor. Software
selection explicitly rejects Firefox rather than mislabeling it SwiftShader.
No new site-rendering changes or production deployment in this follow-up.
An independent concurrent commit `2870249` fixes first-scroll reveal state in
`CinematicWorld` and adds chapter-reveal tests. It is preserved. The browser
comparisons here exercised the existing preview/local production artifacts
identified above, not a rebuilt artifact containing that later UI fix; do not
extend these results to the latest checkout without rebuilding and rerunning.

Same available Linux/RTX machine, Firefox 155, 1440×900 CSS/DPR 2, 30-second
forward/reverse scripted journey; power mode unknown:

| Execution | Live windows (submissions/sec) | Candidate windows | >100 ms stalls, live/candidate |
| --- | --- | --- | --- |
| Headless | 48.6 / 46.3 / 53.0 | 47.7 / 47.0 / 53.2 | 7 / 5 |
| Visible window | 60 / 60 / 60 | 59.7 / 60 / 60 | 0 / 0 |

Headless runs changed resolution 2→1.7→2; therefore these are **not fixed-quality
speed comparisons**. Visible-window runs stayed full 2880×1800 source/foreground,
MSAA 4, bloom/full detail/12,000 particles, no quality transitions. Visible-window
submission p99 live/candidate 17.12/17.14 ms; maximum 17.16/34.08 ms; raw callback
p95 17.08 ms both. No demonstrated speedup; native-gesture latency and allocation
savings remain separate implemented benefits. GPU queries unavailable; renderer
string privacy-masked. Headless/headed change alone removes the local failure,
but underlying compositor/backend cause is not proven (`about:support` inaccessible
through Playwright). Do not attribute this failure to Windows Zen or power saving.

Artifacts `/tmp/matrix-firefox-{production,candidate}.json` and
`/tmp/matrix-firefox-headed-{production,candidate}.json`. Next primary gate remains
the Legion/Windows/Zen normal versus battery-saving test on **the same preview**,
actual WebGL/backend and exported raw callbacks/submissions. Minimal console export
is in the [physical-device procedure](physical-device-performance-procedure.md).
Firefox control command: `PROFILE_BROWSER=firefox PROFILE_HEADED=1 PROFILE_DEVICE=desktop PROFILE_DPR=2 PROFILE_DURATION_MS=30000 node scripts/mobile-soak.mjs`.

Owner has now identified the affected laptop as a Lenovo Legion with laptop
RTX 4080, Windows and Zen (Firefox-derived); battery saver was probably enabled.
Actual WebGL GPU/backend and plugged-in normal-power comparison remain unknown.
Owner also reports slight battery-saving lag across multiple devices. This does
not establish weak GPU hardware or an OS callback restriction. Prior unknown-model
notes below describe the evidence available when those measurements were taken.

Final standard-size browser suite: 29 passed, 9 intentional skips. HiDPI DPR 2
then exposed a merged-pass discrepancy: maximum one display code value, but
12.2629% changed channels in the first capture. The strict threshold was not
relaxed. Merged rendering was removed from the candidate; original separate
world/foreground passes and depth resolve are retained. Only final-grade target
reuse remains adopted, along with precision input routing and async teardown.
Earlier merged measurements below remain experiment evidence, not final results.

The initial October 3 preview `90ce58b4-ee09-4714-895b-b5901a749310` contains the
rejected merge and is superseded by the next upload. Production remains unchanged.
Current comparison control is `PROFILE_LEGACY_COMPOSER_SWAP=1`, using
`useLegacyComposerSwap(true)`; it changes target reuse, not the pass graph.

Final preview version: `f8c5709c-c040-4116-8d1c-6147ee2985ea`, Nuxt build
`dac4a8f5-ed70-4ec6-a40c-78aed8c8b94d`, entry `BMkwktRK.js`:
<https://laptop-fidelity-oct03-matrix-fellows.lunarzdev.workers.dev>.
Fresh HTTP retrieval confirms that entry. No production traffic deployment.
Final source: 161 unit tests, typecheck, build and docs links pass. Final browser
suite at desktop DPR 2: 29 passed, 9 intentional device-specific skips, including
the unchanged strict image gate across five positions and actual GL allocation
checks. Results: `/tmp/matrix-laptop-fidelity-e2e`. MSAA allocation remains one
color/depth pair; the original three color resolves and depth transfer are retained.

Final 180-second RTX/Chromium control (1440×900 CSS/DPR 2): all eighteen
ten-second windows 60 submissions/sec; p50/p95 16.7 ms, p99/max 16.8 ms,
zero >100 ms stalls, scene-update p95 0.1 ms, CPU submission p95 0.3 ms,
valid asynchronous GPU p95 6.636 ms. Full 2880×1800 source/foreground, MSAA 4,
bloom, full detail, 12,000 particles, no quality transitions. Requested/rendered
progress lag p95 zero under scripted input; request age p95 1.8–3.5 ms per window.
No browser errors. Artifact `/tmp/matrix-laptop-fidelity-soak.json`. This is a
nonregression control, not a measured speedup or physical laptop presentation.

Firefox 155 Linux Playwright check at DPR 2: 3 passed, 1 intentional mobile-only
skip, same strict five-position image gate and actual GL allocation checks.
Artifact `/tmp/matrix-laptop-firefox-e2e`. Renderer reports the privacy-masked
`NVIDIA GeForce GTX 980, or similar`, not reliable actual hardware identity;
2880×1920 cinematic buffer. This does not reproduce Windows Zen/battery saver.
Run with `PROFILE_BROWSER=firefox PROFILE_DPR=2` and the laptop-rendering spec.

Reproduce final candidate:

```sh
TEST_BASE_URL=http://localhost:8787 PROFILE_GPU=hardware PROFILE_DPR=2 npx playwright test tests/e2e/laptop-rendering.spec.ts tests/e2e/render-pipeline.spec.ts tests/e2e/timeline-snap.spec.ts --workers=1
TEST_BASE_URL=http://localhost:8787 PROFILE_GPU=hardware PROFILE_DEVICE=desktop PROFILE_DPR=2 PROFILE_DURATION_MS=180000 PROFILE_OUTPUT=/tmp/matrix-laptop-fidelity-soak.json node scripts/mobile-soak.mjs
```

## Identity and evidence boundaries

Base commit: `c4fa063`. Owner identifies the live production site as the laptop
complaint baseline and reports substantially improved iPhone sharpness/cadence.
That is valuable informal feedback, not instrumented physical-device certification.

Cloudflare production is now `16fe788b-1ec9-40a2-a71a-25d0e3d77a6b` (deployed
October 1, 11:11 UTC), newer than the previous checkpoint's production identity.
Production loads `DbrKkHu4.js`; closeout preview loads `DNLbvy9b.js`. Both load
the **same** `BSAKntMx.js` renderer bundle, SHA-256
`69ca534aec27dbd9e4f765d55d26f1801c4cba3d4059b5e3d0b9f815dccbede5`.
Do not attribute today's complaint to the obsolete mobile renderer. This checks
fresh requests, not the owner's browser cache. Production has not been changed
by this pass.

Only RTX 4070 Ti SUPER hardware is available here; no affected physical laptop,
integrated GPU, Safari or Android device is available. Owner laptop model,
OS/browser, refresh rate, battery/power settings and thermal conditions are
requested and still unknown. RTX results below are controls, **not laptop proof**.

## Baselines and first experiment

Chromium desktop emulation, 1440×900 CSS, DPR 2, fine pointer, 20 reported logical
processors/32 GB memory; actual ANGLE NVIDIA OpenGL ES backend. Power mode unknown.
Production and closeout preview both selected cinematic: 2880×1800 procedural
and foreground buffers, 4× MSAA, full detail, bloom, 12,000 particles.

- Fresh production 30-second journey: windows 60/59.6/60 submissions/sec, GPU
  p95 5.466 ms, maximum submission interval 50 ms, no >100 ms stalls.
- Closeout preview: windows 60/60/60, GPU p95 6.274 ms, maximum 16.8 ms.
- Candidate's matched separate-pass control versus first merged-pass experiment:
  both 60/60/60, GPU p95 6.503 versus 6.584 ms. **No demonstrated RTX speedup**
  from merging alone. Visual comparison across five scene positions passes;
  actual GL counters show the eliminated intermediate resolve.

Artifacts: `/tmp/matrix-laptop-{production,preview}-baseline.json`,
`/tmp/matrix-laptop-{legacy,merged}-journey.json`. These record scene submissions,
not physical display presentation. No affected-laptop failure is reproduced yet.

## Implemented candidate

- Cinematic world and foreground draw into the same HDR/MSAA attachment in one
  scene call. The clip-space world is first, preserves its computed depth, and
  does not depend on the perspective vertex transform. Same shaders, density,
  sample count, resolution, bloom and final grade. Efficient iPhone path unchanged.
- No postprocess consumes resolved depth, so combined mode avoids its resolve.
  Legacy diagnostic retains it: Three r180 may invalidate unresolved MSAA depth,
  which makes disabling it across *separate* geometry calls unsafe.
- Final grade outputs to the canvas; it does not need a ping-pong swap. Keeping
  the scene target stable prevents allocation of the second full-size HDR/MSAA
  attachment set. Composer still owns/disposes its target objects normally.
  At 2880×1800, RGBA16F + assumed 4-byte depth + 4× sample attachments estimate
  ~296.6 MiB per set (~593.3 MiB for two). This excludes bloom/canvas/driver
  overhead, and is an allocation estimate, **not measured total VRAM**.
- Compile the actual combined-scene variants before drawing. Await all linker
  operations before releasing resources on early route exit. Existing early
  teardown test caught `isReady` rejections; deferred release removes that race.
  DOM, observers and RAF detach immediately, with idempotent disposal.

### Wheel/trackpad interaction

Wheel events identify gesture units, not hardware. The new constant-space policy
passes precision, fractional, diagonal, variable and ambiguous pixel input to
native scrolling. Explicit line/page wheels smooth immediately. Repeated large,
quantized pixel notches can smooth; a first ambiguous notch stays native. Precision
tails remain native for a short gesture window. This is a conservative heuristic,
not infallible trackpad detection (some mice provide precision input).

Precision remains native through the entire uninterrupted gesture, including a
long quantized tail; it resets only after a pause. A longer-tail regression failed
the initial 240 ms-from-first-event implementation and passes the gesture latch.
Native input cancels the old Lenis easing at actual document scroll, never its
pending destination, and clears pending wheel assistance. Mouse smoothing retains
its existing curve/multiplier and is loaded for fine-pointer interaction as before;
touch-only devices still do not import Lenis. Touch-primary devices already
reporting a secondary fine pointer can load wheel interaction without changing
their touch layout or efficient renderer. Keyboard/anchors, pinch zoom, nested dialogs,
selection and reduced motion remain independent. No per-wheel timers, layout
reads, UA probes, global ticker cap or additional scroll controller were added.

## Reproducible controls

Existing soak/profile scripts now accept `PROFILE_DEVICE=desktop`, viewport and
DPR options. Soak records hardware signals, script identities and renderer state.
`PROFILE_SEPARATE_SCENE_PASSES=1` enables the old desktop resolve/swap graph on
the same candidate. `PROFILE_PIPELINE=efficient|cinematic` controls startup only
with `?matrixProfile`; ordinary URLs ignore the override.

For matched procedural/foreground pixel comparisons, use
`PROFILE_QUALITY='{"atmosphereRatio":2,"foregroundRatio":2,"detail":true,"particleFraction":1}'`.
Direct efficient composition lacks desktop MSAA/bloom and grades foreground
locally rather than after blending. Its timing is therefore **only a diagnostic
upper bound**, not an equivalent replacement. No automatic laptop-to-efficient
switch has been shipped on the strength of CPU/memory/pointer guesses.

## Validation and remaining work

161 unit tests, typecheck and production build pass. Browser gesture tests pass;
combined/separate frozen captures pass at .8, 1.8, 2.45, 3 and 4.4. An isolated
mobile equivalence failure (max delta 21) occurred in the broad run; three
subsequent isolated repeats pass. Retain this as a flake/verification risk until
the complete final rerun is recorded; do not weaken the image threshold. The
subsequent complete rerun passed all 28 applicable checks with eight intentional
skips, retaining that exact threshold. Logs `/tmp/matrix-laptop-e2e-final.log`.

Matched 120-second desktop journeys, same full cinematic quality/source/foreground
2×, 4× MSAA, bloom and 12,000 particles: both 12 windows at 60 submissions/sec,
p99/max <=16.8 ms, no >100 ms stalls. GPU p95 legacy 5.891 versus candidate
6.126 ms: **not a demonstrated GPU speedup**. Renderer textures 14→13; direct GL
allocation regression confirms one MSAA attachment pair instead of two, two color
resolves instead of three and no resolved-depth blit. Resource savings are proven;
affected-laptop delivery improvement is not yet measured.
`/tmp/matrix-laptop-final-{legacy,combined}.json`.

120-second iPhone-emulation nonregression: all windows 59.9–60, p99 16.8 ms,
maximum 33.4 ms, native 1170×2532 foreground/full detail/12,000 particles. Source
recovered 1×→1.25×, final 488×1055, **not** the prior closeout's 1.5625×. No claim
of equal-fidelity native-source recovery across these separate GPU runs.
`/tmp/matrix-laptop-mobile-nonregression.json`.

Three-second wide-layout DOM control: normal/paused-WebGL style time 82.889/83.361
ms, layout 2.095/2.057 ms, task 342.354/317.597 ms; RAF p95 16.7 both. This
isolates that transition on RTX, not pointer-hover costs or a laptop compositor.
`/tmp/matrix-laptop-dom-profile.json`.

### Rejected HDR-split prototype

Direct/split path comparison at the same 2880×1800 source/foreground, full detail,
12,000 particles, bloom deliberately disabled in both: cinematic GPU p95 8.619 ms,
efficient 5.449 ms, windows 60 versus 59.8–60. These 30-second runs have different
MSAA and blending/grade order; they are not a shipping-equivalence comparison.
Do not compare their chapter distribution to the 120-second bloom-enabled runs.

A bounded prototype retained desktop MSAA/bloom/grade order, rendering exact
native procedural color/depth without MSAA then copying into the scene target.
Five matched HiDPI frozen views: four byte-identical; desert differed by at most
one display value in 12.26% of channels from the additional FP16 store/load.
Same-renderer alternating fixed storm (1.8/time 8), unchanged dimensions/effects:
combined GPU medians 4.869/5.543 ms, split 5.621/5.741 ms; p95 combined 5.399/5.700,
split 5.950/5.889. No gain, extra target/storage and a small numerical color shift.
**Removed** prototype, controls and temporary comparison branch. Original strict
image threshold remains. Artifacts `/tmp/matrix-split-hdr-timing.json` and
`/tmp/matrix-split-hdr-hidpi-equivalence`; no new default path adopted.

The next primary gate is the owner's laptop on the candidate, normal and battery
saving, with model/browser/backend and per-chapter export. Do not claim the laptop
is fixed from RTX controls. Still needed: Android/iPad physical validation,
integrated-GPU thermal soak, browser presentation evidence, pointer-motion
attribution, and trustworthy pipeline/capacity policy beyond hardware hints.
