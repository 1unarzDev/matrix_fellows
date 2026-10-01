# Internship rollout verification

Observed September 30, 2026. Candidate evidence is in the
[audit](../research/opportunities/internship-audit-2026-09-30.md); maintenance
and rollback are in the [runbook](../operations/internship-catalog.md).

## Coverage

24 candidates reviewed: 18 priority candidates, five secondary classifications,
and AEOP. Three concrete public internships added (Stripe, STARS, Houston
Methodist). Six existing internships enriched under their original identities.
Production returns nine internships with structured placement information.
All nine have conditional Texas access, not unrestricted eligibility. No
discovery hubs or foreign-local-only placements were counted as internships.
Microsoft, St. Jude and UChicago are not public Texas additions. Remaining
holds, blocked sources, ambiguous eligibility and historical cycles are
documented individually in the audit. AIMI and UT Dallas remain follow-up
publication reviews despite credible program evidence.

Calendar selections include STARS and Houston Methodist. STARS' January 22
deadline is tentative; Houston's January 29 deadline is confirmed, with June 7
and August 6 endpoints and a visible duration conflict. Stripe has no guessed
deadline or fixed program interval. Saved opportunity projection remains shared.
Production paid filtering excludes Houston Methodist and includes only the
four internship records with positive reviewed compensation evidence.

## Passed

- Unit/database suite: 149 tests across 23 files, including new JSON contracts,
  exact internship evidence, last-good retention, geography review gate,
  stipend exclusion, migration execution/replay, override indexing and calendar.
- Typecheck (Nuxt and separate Worker), production build, documentation links.
- Six internship E2E cases across desktop/mobile: SSR without JavaScript,
  materials disclosures, collection navigation, overflow checks and PIN-protected
  editing with field/stage/date preservation and stale citation removal.
- 18 existing opportunity/meeting-admin E2E cases; 18 meeting/calendar/science-
  accent cases, including overlapping saved periods and unchanged meeting popup.
- Desktop/mobile detail screenshots captured and inspected:
  `test-results/internships-desktop.png`, `test-results/internships-mobile.png`.
- Existing official-source checks; deployed public catalog/provenance and social-
  preview checks. Live API inspected for nine structured internship records,
  paid filtering and new calendar entries.
- Production migrations 021 and 022 applied; backfill repeated to zero pending
  changes. Three enabled annual monitors and two enabled calendar selections
  inspected. Existing override/suppression/history boundaries retained.
- Frontend and opportunity Worker deployed independently.

## Remaining limitations

The 68-query existing search benchmark reported recall@5 0.868 and MRR 0.817
(baseline 0.500 / 0.493), p95 345 ms. Nine judgments remain missed, mostly
multiword typos; this is a residual search gap, not a clean benchmark pass.
No semantic embedding calls or additional account configuration were introduced.

The first scheduled extraction and its matching observation at least six hours
later have **not** been observed in this rollout. Monitor registration, deployment
and mocked/database publication-gate tests do not prove live AI extraction.
The private manual-trigger token was not available locally and was not rotated.
Inspect the next scheduled observations/source errors before claiming live
reconfirmation. Physical iPhone/iPad tests, motion recordings and a before/after
visual comparison were not performed in this pass. Cinematic renderer, native
scrolling and frame-rate gates were not modified.
