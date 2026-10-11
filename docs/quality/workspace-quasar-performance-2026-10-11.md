# Workspace quasar performance pass — October 11, 2026

This pass keeps the existing canvas sizing and effective pixel-ratio formula. It reduces work in the retained fragment field and makes the decorative renderer sleep when it cannot be seen.

## Changes

- Guarded disk, filament, volumetric, corona, fold, and foreground calculations by their visible support. Individual filament puffs also skip noise when their angular contribution is below the output threshold.
- Kept the stars, jets, tone mapping, colors, and full-resolution drawing buffer intact. A deterministic WebGL comparison at 1036×648 and times 0, 8, and 24 changed about 0.98% of RGBA bytes; only about 0.67% differed by more than two channel levels.
- Deduplicated resize work, paused on hidden tabs and offscreen canvases, and resumed safely after visibility or intersection changes.
- Added WebGL context-loss recovery and idempotent teardown.
- Disabled the unused depth buffer, selected fragment precision conditionally, and request asynchronous shader compilation when the browser exposes it.

## Controlled measurements

The repeatable harness is `scripts/benchmark-quasar.mjs`; it instruments the real dashboard fixture and reports canvas dimensions, frame callbacks, and WebGL draw submissions. GPU timer queries are optional and were unavailable in this environment.

At 1440×960 CSS pixels (1036×691 drawing buffer, DPR 1), isolated Chromium runs using the same software renderer measured:

| Build | Draw submissions | RAF callbacks |
| --- | ---: | ---: |
| Retained baseline | 10.3/sec | 12.7/sec |
| Optimized pass | 37.3/sec | 48.0/sec |

At 390×844 CSS pixels (350×759 drawing buffer, DPR 2), the optimized pass measured 42 draw submissions/sec and 60.3 RAF callbacks/sec.

These are controlled llvmpipe/SwiftShader proxy measurements, not physical-device guarantees. The benchmark cannot establish mobile Safari or integrated/discrete GPU behavior; validate those devices before making a broad FPS claim. The renderer still reports no GPU timer extension in this environment.

Run the checks with:

```sh
node --import tsx scripts/benchmark-quasar-diff.mjs
TEST_BASE_URL=http://127.0.0.1:3000 QUASAR_GPU=hardware node --import tsx scripts/benchmark-quasar.mjs
```
