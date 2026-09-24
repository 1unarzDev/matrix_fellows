# Research-guide authoring

The research library is a focused teaching resource, not a blog. It lives at
`/guides` and `/guides/[slug]`; the cinematic homepage shows only six summaries.

## Architecture decision

Nuxt Content v3 was evaluated first. Its current Cloudflare Workers deployment
path requires a D1 `DB` binding, which this frontend does not provision. Adding a
second content database solely for eleven Git-backed guides would expand the
deployment and failure surface without improving authoring. The implementation
therefore uses `@nuxtjs/mdc`: Markdown remains clean and reviewable, while the
build emits each guide as a lazy route chunk. Re-evaluate Nuxt Content if the
deployment gains D1 for another justified purpose. Source details are in the
[implementation review](../research/guides/implementation-sources.md).

## Add or edit a guide

1. Edit a file in `content/guides/`. Keep the writing concise, actionable, and
   honest about uncertainty, field differences, and safety requirements.
2. Keep front matter aligned with `shared/data/guides.ts`. Slugs are stable public
   identifiers; changing one changes links, canonical URLs, and the sitemap.
3. Use existing MDC components for instructional visuals. New visuals belong in
   `app/components/content/`, need an accessible text equivalent, and must be
   original or carry documented reuse permission.
4. Add only HTTPS companion resources from authoritative sources. A link supports
   the guide; it does not replace Matrix’s actionable explanation.
5. Run `npm test`, `npm run typecheck`, `npm run build`, `npm run docs:check`, and
   the guide browser suite before publishing.

The metadata schema in `shared/utils/guide-validation.ts` validates category,
stage, reading time, updated date, relationships, resources, and other front
matter. Unit tests also reject missing related slugs, non-HTTPS resources, an
unbounded homepage preview, or registry/file drift.

## Content and visual rules

- Prefer a consequential decision, worked example, reusable artifact, and repair
  of a common failure over a list of motivational tips. The depth-expansion
  source audit is in
  [the September 2026 research note](../research/guides/depth-expansion-2026-09-24.md).
- Keep at most one prominent admonition in a guide. Reserve it for a genuine
  action boundary, safety issue, or final audit; ordinary advice belongs in the
  body, a table, or a worked example.
- Reuse the sensor and public-data cases when that continuity helps readers see
  how evidence changes across planning, analysis, and communication. Clearly
  label teaching data and never present invented values as published findings.
- State what a student can do next. Do not invent credentials, acceptance odds,
  compliance conclusions, or universal rules for every discipline.
- Keep source claims attributable and update the `updated` date only after a real
  review.
- Use the existing typography, restrained palette, spacing, and prose components.
  Let spacing and type create section rhythm; avoid stacking dividers, borders,
  and framed callouts. Guide pages do not initialize Three.js.
- Verify 320–430 CSS-pixel layouts, keyboard focus, reduced motion, external-link
  labeling, and SSR text. There should be no horizontal document overflow.

## Rollback

Guide routes are additive. A faulty guide can be removed from the registry,
prerender list, related arrays, and Markdown directory in one change. If the
renderer integration fails, revert `@nuxtjs/mdc` and the guide routes without
touching the homepage world, public content API, opportunity catalog, or database.
