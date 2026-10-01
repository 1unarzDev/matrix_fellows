# Internship catalog operations

Reviewed September 30, 2026. See the [candidate audit](../research/opportunities/internship-audit-2026-09-30.md) for primary evidence and fetch limitations.

## Publication boundary

The initial implementation adds Stripe, UT Southwestern STARS and Houston
Methodist and enriches six existing public placements in place. IDs are stable.
Texas access is conditional, not a promise of admission or universal eligibility.
STARS is North Texas only; Stripe requires relocation and employment eligibility.
Houston requires full-time attendance and independent housing arrangements.

The research audit recommends AIMI and UT Dallas for consideration. This rollout
holds AIMI until current eligibility/cost requirements are available and leaves
UT Dallas for a separately reviewed research-program addition. Microsoft,
St. Jude and UChicago are excluded from Texas-facing results. AEOP is a
discovery family until specific host placements are reviewed, not an actionable
internship or a yearlong calendar period. Other blocked/unspecific candidates
remain in the audit, not in public counts.

## Data and review

`internship` stores reviewed Texas access, placement classification, duration,
commitment, housing, meals, experience, independent-work policy, application
materials and stages. Existing restrictions store school year, age, geography
and citizenship/work authorization. Existing costs store application/tuition,
compensation, travel and aid; missing values mean unknown, never free.
Field evidence links and confirmation dates remain separate from annual dates.
Admin edits remove stale citations for the changed internship/restriction field.
Attach fresh reviewed evidence when publishing a correction; do not reuse a
quote that no longer supports the displayed claim.

Application opening, application deadline, separate recommendation deadline,
interview/offer dates and program dates use typed milestones. Unknown dates
remain absent. Stripe's May–August window is not a fixed program interval.
Houston's eight-week/dates conflict remains visible and is projected as endpoints,
not continuous attendance. STARS' schedule is subject to change and tentative.

## Monitoring and capacity

Three new monitors use the existing scheduled Worker, bounded document fetching,
exact quote validation, last-good preservation, source-health errors, two matching
observations at least six hours apart and owner overrides. No independent scheduler
or secret is introduced. The extraction/cache version is `evidence-agent-v8`.
New employer hosts are confined to the reviewed specific route paths. Unsupported
costs/checklists are rejected; geography changes require editor review rather
than silently extending Texas eligibility. A successful date observation is not
proof that every missing metadata field was verified.

The new routes add three jobs to the existing daily/three-hour queue. Inspect
`opportunity_monitors` and observation/error history for backlog and model/fetch
failures. A 403, removed listing or malformed extraction must retain last-good
data and raise health status; it is not discontinuation evidence. Do not increase
model limits or loosen evidence checks to clear a backlog. Editorial review is
required for newly discovered host/job URLs. No embeddings are introduced.

## Rollout and recovery

1. Run unit/database tests, typecheck, build, docs checks and opportunity E2E tests.
2. Apply additive migrations `021_internship_catalog.sql` and `022_internship_compensation_filter.sql` with the linked Supabase CLI.
3. Run `npm run backfill:catalog`, inspect the dry run, then run with `-- --apply`.
   Existing overrides/suppression/history survive; reviewed enrichment is versioned,
   writes are guarded by `updated_at`, new monitors use ignore-duplicates.
4. Deploy the opportunity Worker independently with `npm run deploy:imports`,
   then frontend with `npm run deploy` and verify live catalog/detail/calendar.
5. Inspect at least one new monitor observation; report a full repeated confirmation
   only after the actual six-hour gate has been observed.

For rollback disable affected monitors, suppress new routes and disable their
calendar selections through the editor; retain evidence/history. Revert frontend
and Worker deployments separately. The additive JSON fields can remain and are
ignored by older code. Do not reseed, delete responses or reset editor overrides.
Migration calendar seeds use `ON CONFLICT DO NOTHING` and never re-enable an
editor-disabled selection. Saved routes continue using the same calendar projector.

Physical iPhone/iPad verification and the six-hour live confirmation require
observed testing; Chromium emulation does not establish either.
