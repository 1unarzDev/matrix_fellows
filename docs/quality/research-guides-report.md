# Research-guide implementation report

**Date:** 2026-09-24

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

## Depth and presentation revision

- All eleven guides now teach through worked decisions and reusable artifacts:
  mentor-fit and response workflows, a literature matrix, paper claim traces,
  question specifications, a complete mini-protocol, experimental-unit
  reasoning, a shared teaching dataset, graph specifications, an
  evidence-to-impact chain, abstract reverse outlining, and interview follow-up
  drills.
- A low-cost sensor case and public-data/ML cases recur across guides so readers
  can follow evidence from an idea through planning, analysis, and presentation.
  Invented values are explicitly labeled as teaching data.
- Prominent admonitions are limited to one per article. Full-width heading
  rules, repeated subheading markers, table dividers, and several vertical rules
  were replaced with spacing, compact accents, and tonal surfaces.
- Instructional figures and callouts use a restrained 1–2 pixel hover lift,
  localized glow, and a long deceleration curve. Reduced-motion mode removes
  transforms and transitions.
- The source and editorial audit is recorded in
  `docs/research/guides/depth-expansion-2026-09-24.md`.

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
- The 2026-09-24 revision passed all 126 unit tests, typechecking, documentation
  links, the production build, and all eight focused guide Playwright checks in
  desktop and mobile profiles. Manual Chromium captures covered desktop, 390,
  and 320 CSS pixels; an overflow probe at 320/360/390/430 reported document
  width equal to viewport width. A JavaScript-disabled 390-pixel request returned
  HTTP 200 with the protocol and approval content present.
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
