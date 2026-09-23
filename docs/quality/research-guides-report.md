# Research-guide implementation report

**Date:** 2026-09-22

**Environment:** local Nuxt development and production builds; Playwright
Chromium desktop and emulated mobile viewports. No physical-phone claim is made.

## Delivered

- Eleven substantive guides cover mentor outreach, idea generation, paper
  reading, question design, study planning, practical statistics, posters,
  graphs, scoped impact claims, abstracts, and presentations.
- `/guides` and every `/guides/[slug]` page SSR useful text and normal links.
- Six summaries appear in the homepage community chapter; guide bodies remain in
  separate lazy chunks and do not enter the homepage content payload.
- Original Matrix instructional components provide email, planning, statistics,
  poster, graph, claim, and presentation examples without copied poster artwork.
- Canonicals, sitemap URLs, prerender routes, strict 404 behavior, metadata, and
  article Open Graph fields cover the new routes.

## Observed checks

- Focused metadata/content unit tests: passed.
- Focused guide Playwright checks on desktop and mobile profiles: passed.
- The current expanded Playwright suite has 60 runnable checks passing with six
  intentional skips. The guide-specific checks pass in both desktop and mobile
  profiles.
- All eleven guide bodies checked at 320, 390, and 430 CSS pixels: 33 route/
  viewport combinations rendered section content without horizontal overflow.
- Index captures were made at 320, 360, 390, 430, and 1440 CSS pixels. The poster
  guide was captured at 390 CSS pixels with all five original instructional
  figures present. Homepage preview captures cover 390 and 1440 CSS pixels, and
  the study guide was captured at 390 CSS pixels with JavaScript disabled.
- TypeScript checks and a Cloudflare-module production build passed. The build
  emitted each Markdown file as its own server chunk.
- A production homepage request loaded no guide-body chunk. The existing
  SwiftShader mobile regression gate passed with 16.7 ms RAF p95, a reported
  30.0 rendered fps, 1.0 canvas pixel ratio, and five draw calls. This is a
  software/emulation regression check, not physical-phone evidence.

The captures in this directory are emulation artifacts, not evidence of physical
Safari or budget-Android performance. Guide pages intentionally avoid WebGL, but
physical-device accessibility and browser rendering remain useful final checks.

## Outstanding

- Production deployment and live canonical/sitemap observation were not
  authorized or performed.
- Physical Safari, budget Android, and screen-reader testing were not available.
- A true before capture of routes that did not previously exist is not possible;
  the homepage regression suite is the comparison boundary for the added preview.
