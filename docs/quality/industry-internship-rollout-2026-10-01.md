# Industry internship expansion verification

Observed September 30–October 1, 2026. See the
[primary-source audit](../research/opportunities/industry-internship-recheck-2026-09-30.md)
and [operator runbook](../operations/internship-catalog.md).

## Passed

- 152 unit/database tests; Nuxt and Worker typechecks; production build; local
  documentation links; `git diff --check`.
- Six live Chromium E2E cases: three new detail pages on desktop and narrow
  mobile, correct classification/logistics, no horizontal overflow.
- Full-page captures under `test-results/`: each new route slug followed by
  `-desktop.png` or `-mobile.png`. Amazon mobile, Sandia desktop and UT ARL mobile
  were visually inspected; no panel/text clipping observed.
- Production additive backfill applied: existing metadata changes 0, new
  suppression changes 0. Repeat dry run remained 0; ignore-duplicates preserves
  published IDs, owner changes, existing monitors and history.
- Separate opportunity Worker deployed with the existing AI binding and cron
  schedules. No migration or frontend changes were needed.

## Coverage and boundaries

Two specific internship routes were added, not discovery hubs: Sandia job
698908 (undated browser-verified listing, conditional relocation/guardian access)
and UT ARL (historical 2026 cycle, conditional UT admission). Amazon was added as
a high-school scholarship application with a later college internship, not as a
third immediate high-school internship. No new current dated calls or default
upcoming calendar periods were manufactured.

Microsoft and Lockheed are local-only outside Texas; Boeing explicitly excludes
high-school students. MITRE/IBM/Dell/Intel and unverified Amazon employment leads
remain monitor targets, not approved routes. This pass does not establish that
these employers have no other local/partner opportunities.

## Blocked / not observed

- Sandia direct acquisition returns PeopleSoft access shells; Worker now rejects
  these and retains last-good. Browser verification is not automated fetching.
- UT ARL PDF-only annual dates/pay/materials require manual re-verification.
  No PDF extraction implementation or unrestricted future-path fetching added.
- No successful live AI extraction or six-hour repeated confirmation observed
  for the new monitors; no live-run token available locally. Source health must
  be reviewed after scheduled runs.
- Physical iPhone/iPad testing was not performed; mobile results are Chromium
  emulation. No frontend motion was changed by this expansion.

Rollout and rollback are in the operator runbook: suppress only the new routes
and disable their monitors if needed, retaining observations/evidence. Do not
reseed the catalog or delete records.
