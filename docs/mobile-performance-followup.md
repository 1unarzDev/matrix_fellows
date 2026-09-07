# Mobile rendering follow-up — 2026-09-07

The diagnosis loop is `node scripts/mobile-performance.mjs`: a six-second
research-to-depths scroll at iPhone13 viewport size, with SwiftShader. It records
RAF median/p95 and rendered FPS, and rejects shader/JavaScript errors. Its 50 ms
p95 budget remains failing on this software GPU; this is not physical iPhone QA.

Baseline: median83.4 ms, p95150.1 ms,59 callbacks. Final error-free run:
median66.6 ms, p9583.3 ms,95 callbacks. These are development-server, single-run
comparisons, not guaranteed device performance. Intermediate50/67 ms results
were invalid because a shader failed and are excluded.

Changes:

- Mobile replaces desktop multi-mip bloom with symmetric highlight taps inside
  grading, retaining shader-based atmospheric glow and final FXAA.
- Background ray tracing has its own adaptive .70–.45 resolution target.
  Color and depth are composited before foreground geometry; foreground remains
  at1 CSS pixel resolution with2x supported MSAA even under sustained load.
- Mobile particle count2600 instead of4200; desktop unchanged.
- Skip inactive dust/underwater shading. Begin storm-water tracing at the actual
  vertical swell envelope, preserving the512-step limit and distant coverage.
- A sustained50 ms cadence now triggers mobile quality adaptation instead of
  being considered healthy by the previous52 ms threshold.
-75 ms exponential camera settling operates only on mobile, once per rendered
  frame. Native scrolling remains untouched; initial hash positioning is exact.

Checks: frame-rate independence and no overshoot unit test; mobile camera
settling, shader-error capture, stable foreground resolution, toolbar resizing,
and first-paint regressions. Oasis/depth screenshots inspected. Physical Safari
testing remains necessary, especially low-power mode and thermal throttling.
