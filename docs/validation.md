# Validation — 6 September 2026

## Completed

- Nuxt and scheduled-Worker TypeScript checks pass.
- 13 unit/database tests pass, including tests against the actual migration in embedded PostgreSQL.
- 8 Playwright tests pass against the built application running in Cloudflare's local Worker runtime, across desktop and mobile Chromium profiles.
- Browser coverage includes direct deep links, reverse scene synchronization, early section navigation, expandable research details, opportunity search/empty states, editor opening/closing, reduced motion, and unavailable WebGL.
- Production Nuxt build passes. Frontend and scheduled importer both pass Wrangler deployment dry runs; no remote resources were deployed.
- Vue components contain no CSS style blocks or inline style attributes. The stylesheet contains Tailwind import/theme configuration only.
- Desktop and mobile-emulated screenshots were inspected for typography, framing, atmosphere, reading contrast, and the oasis silhouette. References and visual changes are documented in `art-direction.md`.

## Performance observations

Hardware-accelerated Chromium using an NVIDIA GeForce RTX 4070 Ti SUPER through ANGLE/OpenGL ES measured approximately **30 fps** at all six stationary chapter positions. Measurements used 1440 × 960 desktop and an iPhone 13 viewport profile, with canvas pixel ratio capped at 1 in these runs. Rendering intentionally caps at 30 fps.

The mobile profile is browser emulation on the same desktop GPU, **not a physical phone benchmark**. Initial tests using SwiftShader were much slower and are not representative of hardware GPU performance. The runtime adapts pixel ratio and particle count under sustained load.

Regenerate screenshots and measured canvas diagnostics with `npm run capture` (requires a running app and Playwright Chromium). Output is stored in `test-results/visual`; browser test traces use the separate `test-results/e2e` directory.

### Hero water regression

`node scripts/check-hero-water.mjs` renders the actual world fragment shader with a water-only diagnostic output in headless WebGL. It asserts zero water pixels at the opening camera across four aspect ratios and six pinned times, with positive controls confirming water remains visible at the crest and open ocean. Before the correction, all 24 hero samples failed. The corrected basin bounds and conservative terrain occlusion pass all samples. This catches shader visibility errors independently of the text overlay; it is not a physical-device performance test.

### Submersion black-box regression

The refracted waterline could push `uv.y` below zero. A fractional power in underwater lighting then produced NaN values on the hardware GPU; HDR bloom spread those values into a large black region. SwiftShader did not reproduce the invalid arithmetic, so software-only browser tests missed it. Lighting height and the Fresnel power base are now bounded to valid domains.

- `node scripts/check-waterline.mjs`: 804 hardware-WebGL samples using the actual shader and camera spline, two aspect ratios, and two pinned times. Asserts no NaN pixels. `--replay-unclamped` is an intentional negative control: it restores the invalid lighting expression in the test shader and fails near progression 2.27–2.30.
- `node scripts/check-descent-render.mjs`: 81 full-browser screenshots across submersion, including GSAP and HDR bloom. Rejects abrupt dark-frame changes and browser errors. The pre-fix run reproduced the black box around progression 2.26; the corrected run passes.
- Adaptive resizing was investigated and ruled out for this report: the failure occurred without a pixel-ratio change. Its timing was not changed in the final fix.

### Terrain/model depth regression

`node scripts/check-terrain-depth.mjs` renders the actual world shader and two proxy markers using the production depth-write/clear configuration. Before the fix, both markers were visible, including the one behind the dune. With shared perspective depth, the hidden marker has zero visible pixels while the above-dune positive control remains visible. This checks true occlusion rather than concealing the issue with a timed opacity change. Crest and oasis captures were also inspected after enabling multisampling and palm alpha-to-coverage.

## Deployment-dependent checks

- Configure Supabase and exercise actual owner magic-link email delivery and a published content update.
- Enable verified sources and observe the first scheduled import in the deployed Worker. The shipped sources are curated official discovery links; no feed is silently enabled.
- Verify performance on a physical midrange phone, including Safari, thermal/battery behavior, and browser chrome/orientation changes.
- Replace meeting/project placeholders and add real participation URLs.

These require the owner's account configuration or physical hardware and were not represented as completed local tests.
