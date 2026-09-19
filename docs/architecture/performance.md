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

After mount, the cinematic module waits 100 ms, then dynamically imports GSAP,
ScrollTrigger, and Lenis. The heavy world module is imported only inside
`initWorld()`, after the document fonts and scroll measurements are ready.
`JoinForm` and `AdminPanel` use Nuxt lazy components and are created only when
opened. Reduced-motion users skip world construction entirely.

The arrival veil is a separate low-resolution 2D canvas capped at 30 fps. It
hides renderer/deep-link handoff and releases after the first WebGL frame; a
12-second safety path falls back if the world never becomes ready.

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
scroll. Direct navigation and restored hashes synchronize while the arrival veil
covers the first visible frame.

Layout measurement is cached. A `ResizeObserver` refreshes ScrollTrigger only
when the main document height changes, with a 90 ms debounce. Safari toolbar
height changes do not repeatedly reallocate mobile render targets when width is
unchanged.

## GPU render paths

The procedural environment is a full-screen fragment shader; palms, rocks,
particles, and constellation lines are foreground geometry. Both share depth so
terrain can correctly occlude models.

| Setting                | Desktop                       | Mobile (`max-width: 767px`)                                   |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- |
| Initial particle count | 12,000                        | 2,600                                                         |
| Initial pixel ratio    | `min(devicePixelRatio, 1.5)`  | background `min(devicePixelRatio, 0.7)`; foreground at most 1 |
| HDR target samples     | up to 4× MSAA                 | up to 2× MSAA                                                 |
| Background             | rendered directly in composer | separate half-float color/depth target                        |
| Bloom                  | UnrealBloom multi-mip pass    | eight symmetric highlight taps in grading shader              |
| Final edge treatment   | MSAA                          | MSAA plus FXAA                                                |
| Adaptive ratio floor   | 0.65                          | 0.45 for procedural background                                |

Splitting the mobile background is important: the expensive procedural ray work
can become softer without making palm cutouts, constellation lines, text-adjacent
particles, or wave edges equally blurry. Desktop retains the higher-quality bloom
chain and a single adaptive composer ratio.

## Particle and asset strategy

A single persistent `BufferGeometry` represents sand, rain, underwater motes,
the fish-like current, and stars. Stable per-particle seeds and vertex-shader
trajectories transform the same identities across the journey. This avoids CPU
object updates, per-scene particle allocation, and transition-time buffer churn.

Oasis reeds, rocks, cacti, bushes, and formations use instancing. Imported GLBs
are normalized and merged once, their unsuitable source materials are replaced,
and repeated instances share geometry/materials. Palm clones share the loaded
asset. Optional assets load asynchronously and fail without taking down the world.

Shader work is concentrated where it provides visible leverage: procedural
terrain/atmosphere, water, weather, deep-sea lighting, nebulae, and particle
transitions. Distant water filters micro-detail while retaining broad swell
normals. Fog, darkness, haze, and silhouettes control visibility instead of
requiring dense geometry.

## Frame pacing and adaptive quality

`frame-clock.ts` accepts callbacks near the operating system's 30 Hz boundary,
including slightly early iOS callbacks, and avoids the accidental 33/66 ms
alternation caused by a rigid comparison.

Each rendered frame records both render cost and callback cadence. Sustained
pressure increments a slow-frame counter when:

- render cost exceeds 27 ms; or
- callback spacing exceeds 42 ms on mobile / 52 ms on desktop.

After 30 slow samples, quality changes by:

1. multiplying the adaptive ratio by 0.85, down to the platform floor; and
2. reducing the active particle draw range by 15%.

This is one-way within a session to prevent quality oscillation. On mobile, only
the expensive atmosphere target follows the adaptive ratio; the foreground stays
at its capped sharp ratio. The page exposes `data-fps`, `data-pixel-ratio`,
`data-atmosphere-ratio`, `data-renderer`, and scene-state diagnostics on the canvas.

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
  timeout, and validates results. Successful responses use `Cache-Control` value
  `public, max-age=30, stale-while-revalidate=120`.
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
[mobile report](../quality/mobile-performance-report.md) improved a SwiftShader
scroll run from a median 83.4 ms / p95 150.1 ms to 66.6 ms / 83.3 ms, but still
failed its 50 ms software-rendering budget. The [SEO audit](../operations/seo-audit.md)
recorded a simulated-mobile LCP of 3.5 s and 1,600 ms total blocking time before
the SEO changes; the report explicitly treats animation/bootstrap cost as open.

Current risks:

- physical iPhone Safari performance, thermal throttling, and low-power mode;
- main-thread startup from animation libraries and hydration;
- procedural fragment cost during the ocean/descent transition;
- external Google Fonts on the render path; and
- adaptive quality only decreases—it does not recover after a temporary spike.

## Verification and profiling

Run a dev or production-preview server first where required.

| Command                                   | What it verifies                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `npm run capture`                         | Six chapter captures, canvas diagnostics, desktop/mobile emulation        |
| `node scripts/mobile-performance.mjs`     | Controlled SwiftShader scroll comparison; intentionally not a phone claim |
| `node scripts/check-oasis-dressing.mjs`   | Desktop/mobile assets, reveal, flood, and reverse navigation              |
| `npx tsx scripts/check-hero-water.mjs`    | No water leaks into the hero across aspect ratios                         |
| `npx tsx scripts/check-waterline.mjs`     | Hardware-WebGL waterline samples contain no NaNs                          |
| `node scripts/check-descent-render.mjs`   | Full-render submersion has no dark-frame discontinuity                    |
| `npx tsx scripts/check-terrain-depth.mjs` | Terrain depth correctly occludes foreground models                        |
| `npm test`                                | Frame-clock, weather, domain, database, Worker, and schema invariants     |
| `npm run typecheck && npm run build`      | Both TypeScript runtimes and production bundling                          |

For physical-device work, use Safari Web Inspector and record device model, OS,
power mode, thermal state, viewport/orientation, scene range, observed frame
cadence, and whether adaptive ratios changed. A single stationary FPS number is
not enough; test continuous scrolling through the ocean-to-depth transition.
