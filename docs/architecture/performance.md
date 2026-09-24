# Performance and rendering

This document is the current performance contract for the public site. It
describes the [cinematic adapter](../../app/components/CinematicWorld.client.vue),
[scene implementation](../../app/lib/scene/), and server content path. Dated
measurements belong in [quality reports](../quality/).

## Targets and interpretation

- The cinematic renderer intentionally targets **30 rendered frames per second**.
  A stable 30 fps is preferable to oscillation between higher and missed-vsync
  rates on thermally constrained phones.
- Text, navigation, forms, and opportunity content must remain usable without
  WebGL and under `prefers-reduced-motion`.
- Mobile quality is bounded rather than assumed: fewer particles, cheaper bloom,
  separate background resolution, stable foreground resolution, and adaptive
  degradation are part of the implementation.
- Browser emulation, SwiftShader, and desktop GPUs answer different questions.
  None is a substitute for physical iPhone/Safari testing under normal and low
  power modes.

## Startup and critical path

The server renders the full information hierarchy first. The page has a static
atmospheric background and horizon preview, so it does not wait for Three.js to
be readable or visually coherent.

After mount, the cinematic module waits 100 ms, then dynamically imports GSAP
and ScrollTrigger. Lenis is imported only for fine-pointer layouts; touch uses
native inertia and does not download or initialize it. The heavy world module
starts downloading in parallel with the animation libraries, while construction
still waits for stable scroll measurements. Only the two faces that establish
the narrative layout gate that measurement; unrelated document fonts do not.
`JoinForm` and `AdminPanel` use Nuxt lazy components and are created only when
opened. Reduced-motion users skip world construction entirely. Import/layout and
scene-construction phases yield through `scheduler.yield()` when available, with
a timer task fallback that genuinely returns control to painting.

DM Sans and Manrope are resolved at build time by `@nuxt/fonts`, served as two
same-origin variable WOFF2 files, and paired with metric-adjusted local fallbacks.
There are no runtime Google Fonts requests. The renderer asynchronously compiles
the background and foreground programs before starting its RAF loop; compilation
failure falls back to normal first-use compilation. Import, construction,
compile, and first-scene timings are exposed as canvas data attributes.

The loader keeps its full-screen artwork static. The server-rendered opening is
a gradient atmosphere and fine horizon glow rather than proxy terrain, is used
only at the opening chapter, and has no second canvas or JavaScript loading
loop. One optional 64 px accent rotates around a stable identity mark
using a compositor-only transform, then stops when the first valid composer
frame starts the single 300 ms opacity reveal. A 12-second safety path falls
back if the world never becomes ready; page content and navigation remain
usable throughout. Static resource-route handoffs reuse that small accent on a
pointer-transparent, destination-colored veil after a 110 ms anti-flash delay.

## One scroll clock

There is one master ScrollTrigger timeline, not one trigger per section. It maps
measured document scroll to narrative stage `0…5`. The same update:

- sends a remapped continuous progress value to `World.setProgress()`;
- drives DOM entry/exit depth transforms;
- interpolates the site accent color; and
- updates active navigation.

Lenis owns desktop wheel smoothing and feeds the GSAP ticker. Touch keeps native
inertia (`syncTouch: false`). Mobile renderer progress uses a frame-rate-independent
75 ms exponential settle to absorb stepped touch events without altering document
scroll. Direct navigation and restored hashes synchronize before the first scene
frame; their SSR copy remains visible rather than being covered by a loader.

Layout measurement is cached. A `ResizeObserver` refreshes ScrollTrigger only
when the main document height changes, with a 90 ms debounce. Safari toolbar
height changes do not repeatedly reallocate mobile render targets when width is
unchanged.

## GPU render paths

The procedural environment is a full-screen fragment shader; palms, rocks,
particles, and constellation lines are foreground geometry. Both share depth so
terrain can correctly occlude models.

| Setting                | Cinematic profile             | Efficient profile                                                |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------- |
| Particle buffer / draw | 12,000 / 12,000               | 2,600 / 1,560 initially; one-way floor 1,196                     |
| Initial pixel ratio    | `min(devicePixelRatio, 1.5)`  | background `min(devicePixelRatio, 0.32)`; foreground at most 1.5 |
| HDR target samples     | up to 4× MSAA                 | none; avoids a redundant full-screen multisample resolve         |
| Background             | rendered directly in composer | separate half-float color/depth target                           |
| Bloom                  | UnrealBloom multi-mip pass    | no separate bloom pass                                           |
| Final edge treatment   | MSAA                          | 1.5× foreground plus sharpened background reconstruction         |
| Adaptive ratio floor   | 0.65                          | 0.32 for procedural background                                   |

Profile selection is independent of layout width. Coarse-pointer devices and
machines reporting at most four logical processors or 4 GB device memory begin
efficiently, so landscape phones and weak wide displays do not inherit desktop
MSAA, bloom, and particle settings. CSS breakpoints remain layout-only.

Splitting the mobile background is important: the expensive procedural ray work
can remain bounded without making palm cutouts, constellation lines, text-adjacent
particles, or wave edges equally blurry. Desktop retains the higher-quality bloom
chain and a single adaptive composer ratio. The efficient copy shader reconstructs
the downsampled atmosphere with four hardware-filtered bicubic taps, then restores bounded
local contrast from one bilinear sample, weighted most strongly through the ocean.
The final grade does not blur the already supersampled foreground a second time.
The opening ridge uses the reconstruction alone; direct low-resolution contrast
returns gradually as the camera clears the silhouette.

## Particle and asset strategy

A single persistent `BufferGeometry` represents sand, rain, underwater motes,
the fish-like current, and stars. Stable per-particle seeds and vertex-shader
trajectories transform the same identities across the journey. This avoids CPU
object updates, per-scene particle allocation, and transition-time buffer churn.

Oasis reeds, rocks, cacti, bushes, formations, and the nine palms use instancing. Imported GLBs
are normalized and merged once, their unsuitable source materials are replaced,
and repeated instances share geometry/materials. Palm trunk and foliage primitives
are merged into one typed geometry and shaded in one instanced draw, so neither
part can be dropped by batching. This reduced the oasis peak
from 72 to 18 draw calls. Optional assets load asynchronously and fail without
taking down the world. Programs, buffers, textures, and the production-format
framebuffer path warm before the first oasis frame.

Shader work is concentrated where it provides visible leverage: procedural
terrain/atmosphere, water, weather, deep-sea lighting, nebulae, and particle
transitions. Distant water filters micro-detail while retaining broad swell
normals. Fog, darkness, haze, and silhouettes control visibility instead of
requiring dense geometry.

Deep-sea caustics are an analytic, domain-warped light field evaluated inside
the existing world fragment pass. They replace the former powered-sine streak
band without adding a texture, render target, or light pass. The Depths copy
uses one compositor-scale buoyancy animation of less than two CSS pixels plus a
small SVG current accent. Both CSS animations pause when the chapter is not
active and are removed under reduced motion. The large moving panel surface is
also omitted on narrow layouts; mobile retains the shader caustics and small
current accent without continuously compositing the text block.

Nebula ambience uses the same clock and programs: slow shader-time offsets,
vertex-time coherent group drift, and one bounded analytic streak add no render
target, pass, particle simulation, or animation loop. Cosmic elapsed time pauses
outside the chapter. The streak is composed inside the existing full-resolution
grade pass rather than the downsampled atmosphere, preserving its small head and tapered
tail on mobile. On constrained devices, no optional planet/model is loaded.

## Frame pacing and adaptive quality

`frame-clock.ts` accepts callbacks near the operating system's 30 Hz boundary,
including slightly early iOS callbacks, and avoids the accidental 33/66 ms
alternation caused by a rigid comparison.

Each rendered frame records both render cost and callback cadence. Sustained
pressure increments a slow-frame counter when:

- render cost exceeds 27 ms; or
- callback spacing exceeds 42 ms on mobile / 52 ms on desktop.

The first decision occurs after 10 slow samples and later decisions after 20.
The efficient profile starts at its measured steady-state atmosphere tier,
preventing weak phones from reallocating progressively smaller render targets
while already missing frames. Later quality changes:

1. multiply the adaptive ratio by 0.85, down to the platform floor;
2. disable the mobile halo and reduce procedural FBM/wave octaves; and
3. reduce the active particle draw range, down to 46%.

This is one-way within a session to prevent quality oscillation. On mobile, only
the expensive atmosphere target follows the adaptive ratio; the foreground stays
at its capped sharp ratio. The page exposes `data-fps`, `data-pixel-ratio`,
`data-atmosphere-ratio`, `data-renderer`, shader compile state/time, program count,
draw calls, triangles, points, and scene-state diagnostics on the canvas. DOM
diagnostics update every two seconds rather than every frame. Opt-in
`?matrixProfile` instrumentation retains rendered-frame data in memory and uses
asynchronous disjoint timer queries when the driver supports them.

## Pausing, failure, and teardown

The RAF callback remains scheduled but skips rendering while the document is
hidden or the canvas is outside the viewport. Timing samples reset on resume so
background time is not mistaken for a performance collapse. WebGL context loss
switches to the static fallback.

`World.dispose()` cancels RAF, disconnects the observer, removes resize/context
listeners, disposes oasis resources, geometries, materials, render targets,
passes, composer, and renderer, then releases the WebGL context. The cinematic
adapter separately destroys Lenis, kills the master timeline/trigger, removes
GSAP ticker work, disconnects layout observation, clears transforms, and removes
event/media listeners.

## Network and server performance

- `/api/content` starts three Supabase reads concurrently, uses a 6-second fetch
  timeout, and validates results. Validated successful aggregation is reused by a
  Nitro cached function for 30 seconds with 120 seconds stale-while-revalidate;
  the event is retained so edge refresh can attach to `waitUntil`. Successful
  responses use `Cache-Control: public, max-age=30, stale-while-revalidate=120`.
- Failed public reads use local validated defaults and `no-store`, so a transient
  failure is not cached as healthy content.
- The public HTML is server-rendered; essential copy is not delayed until a
  client fetch or interaction.
- Membership and Sheets endpoints are `no-store`. Opportunity monitoring runs in
  a separate scheduled Worker, keeping source parsing/AI work off page requests.
- Static GLBs are intentionally small and texture-light; repeated vegetation is
  instanced rather than downloaded as unique objects.

## Measurements and known limits

The latest recorded hardware-accelerated chapter captures held about 30 fps on an
RTX 4070 Ti SUPER at desktop and mobile-emulated viewports. That verifies the cap
and shader correctness on that GPU, not phone performance. The dated
[mobile report](../quality/mobile-performance-report.md) records both the older
MSAA removal and the subsequent weak-phone pass. A 120-second SwiftShader
forward/reverse soak rendered at 29.49 fps overall, with every ten-second window
at 28.9–30 fps, rendered-frame p95 at or below 50 ms, and no >100 ms stalls.
This remains a proxy: the owner's phone reported roughly 10 fps before the
second pass and must be retested after deployment. The [SEO audit](../operations/seo-audit.md)
recorded a simulated-mobile LCP of 3.5 s and 1,600 ms total blocking time before
the SEO changes; the report explicitly treats animation/bootstrap cost as open.

Current risks:

- physical iPhone Safari performance, thermal throttling, and low-power mode;
- main-thread startup from animation libraries and hydration on real devices;
- procedural fragment cost during the ocean/descent transition;
- adaptive quality only decreases—it does not recover after a temporary spike;
- the efficient atmosphere remains intentionally soft at a 0.32 ratio, with
  sharpened reconstruction; the foreground is capped at 1.5× and the DOM stays
  at native browser resolution.

## Verification and profiling

Run a dev or production-preview server first where required.

| Command                                     | What it verifies                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run capture`                           | Six chapter captures, canvas diagnostics, desktop/mobile emulation        |
| `npm run perf:mobile`                       | Controlled SwiftShader scroll comparison; intentionally not a phone claim |
| `npm run perf:soak`                         | Rendered-frame 120 s forward/reverse trace with 10 s pass/fail windows    |
| `npm run perf:profile`                      | Startup, Web Vitals, LoAF/long-task, and WebGL-vs-DOM attribution         |
| `npm run perf:shader`                       | Isolated world-fragment timing at the storm/ocean hot spot                |
| `node scripts/check-oasis-dressing.mjs`     | Desktop/mobile assets, reveal, flood, and reverse navigation              |
| `npm run check:mobile-visual`               | iPhone/iPad ratios, complete palms, and deterministic meteor captures     |
| `npx tsx scripts/check-hero-water.mjs`      | No water leaks into the hero across aspect ratios                         |
| `npx tsx scripts/check-waterline.mjs`       | Hardware-WebGL waterline samples contain no NaNs                          |
| `node scripts/check-descent-render.mjs`     | Full-render submersion has no dark-frame discontinuity                    |
| `npx tsx scripts/check-terrain-depth.mjs`   | Terrain depth correctly occludes foreground models                        |
| `npm test`                                  | Frame-clock, weather, domain, database, Worker, and schema invariants     |
| `npm run typecheck && npm run build`        | Both TypeScript runtimes and production bundling                          |
| `node scripts/check-slow-start.mjs`         | Throttled cold/warm startup, early navigation, loader absence             |
| `node scripts/capture-refinement.mjs after` | Narrow layouts and 30 s/transition/cold-load recordings                   |

For physical-device work, use Safari Web Inspector and record device model, OS,
power mode, thermal state, viewport/orientation, scene range, observed frame
cadence, and whether adaptive ratios changed. A single stationary FPS number is
not enough; test continuous scrolling through the ocean-to-depth transition.
