# Dashboard implementation checkpoint

Release update: the scoped dashboard/legal release and both additive migrations
were deployed later October 7. See [production evidence](../operations/dashboard-policies-release-2026-10-07.md).
The original implementation and verification boundaries below are historical.

October 7, 2026, America/Chicago. Dashboard-only work, based on repository revision
`828f748` plus the uncommitted dashboard patch. No commit, production deployment,
remote migration, model activation or real message sending was performed.
Unrelated catalog/admin/import changes and existing untracked assets were preserved.

## Useful result

The working interface now concentrates on Today, Research, Opportunities and
Activities. A member can inspect an assigned nearby research target and its
evidence, edit a personal inquiry with autosave/revision conflict protection,
and reach an accurately disconnected sending boundary. Existing reviewed sending
tests continue to require exact approval and final confirmation.

Saving an opportunity creates no obligations. Pursue reviews uncertainty and
proposed tasks, then creates one canonical plan. Agenda, Calendar, Timeline and
Board read the same pursuit/task records. Members can edit tasks and work sessions,
record application confirmation, create activities and contribution evidence,
inspect capacity and export an internal calendar without external credentials.
Pass is versioned and reversible. URL capture distinguishes an existing catalog
entry from an unverified private reference; it never pretends to extract a new
program or fetches arbitrary URLs.

## Actual keep/remove/migrate inventory

| Existing surface | Treatment |
| --- | --- |
| `WorkspaceShell.vue` sidebar, logo, dark atmosphere | Preserved; four primary tasks, secondary profile/drafts/settings |
| `workspace.vue` generic working-page banner and duplicate heading | Removed from visible workspace; accessible shell heading retained |
| Original target queue and score presentation | Research destination, practical access/field reasons, no fake probability |
| Original drafts/profile/mailbox/outbox workflows | Preserved and improved; private access and assigned-member restrictions retained |
| Legacy `/workspace/planner/items` writes | Return authenticated 410; read-only archive remains accessible |
| `outreach_planner_items` data | Additive migration keeps original rows, stable task IDs and original associations/timestamps |
| Public cinema and login black-hole experience | Not modified by this dashboard implementation |
| Unrelated opportunity/import/admin patch | Preserved, not packaged as dashboard work |

## Meaningful implementation decisions

- Reused Nuxt, Supabase and Cloudflare; no platform migration or microservice split.
- Domain-modeling and Supabase skills informed the separate state machines,
  owner isolation, service-only mutations and additive recovery-preserving schema.
- Private service-mediated writes, owner RLS, expected versions, and an atomic
  idempotent pursuit RPC. Browser clients cannot perform unrestricted writes.
- Catalog IDs are text (`catalog:...`), not fabricated UUIDs.
- Official source dates are immutable pursuit snapshots, separate from internal
  targets and scheduled work. Date-only/month-only/AoE/DST meanings remain distinct.
- Capacity counts canonical sessions once and reports unscheduled backlog and
  unknown estimates separately. Contribution notes do not become profile achievements.
- Shared query transactions preserve section/detail state without racing separate
  router updates. Dialogs capture the original trigger before autofocus and restore it.
- In-flight draft and profile saves use submitted snapshots. Later typing remains
  dirty. A conflicting draft save preserves the buffer and stops automatic retries.
- Society-profile dirty buffers survive unrelated refreshes.
- Saved discovery reads an owner-filtered collection independently of public
  pagination. The newest 500 references are searched with explicit cap/availability
  metadata, rather than silently filtering one public page.
- Calendar facts accept stable source IDs; legacy snapshots use a content-derived
  fallback so multiple same-type facts from one page no longer share an export UID.
  Legacy fallback identities cannot infer continuity across a later date revision.
- Google keys and historical confirmation alone no longer enable Worker analysis:
  the additional `GEMINI_AUDIENCE_AUTHORIZED` release gate requires documented
  suitability for the intended audience. Manual/source work remains available.

## Verification boundary

Production preview: `http://localhost:8799`, local Wrangler configuration
`/tmp/matrix-dashboard-preview.jsonc`, no production-domain routes or secrets.
Build and type checks pass. Unit tests include PGlite execution of additive SQL,
RLS, owner isolation, dependency guards and idempotency; they are not a live
Supabase deployment test. Browser fixtures substitute API transport only and keep
session memory; reload tests are not proof of deployed database persistence.

Final local build fingerprint (sorted Nuxt asset-path SHA256 list, then SHA256):
`ee854f1887680d1ca4261aa755be21d67bb6d5a591c9a0b941917bbf999b1d1a`.
Unit/database result: **304 tests / 49 files passed**. Build, application/Worker
type checks, documentation link checks and `git diff --check` passed. Dependency
Rollup PURE-comment warnings are non-failing; no dependency upgrade was needed.
Final Chromium fixture run: **32 passed** (desktop and iPhone-sized emulation).
Logs `/tmp/dashboard-final-browser.log`, artifacts
`/tmp/dashboard-final-chromium`. This includes first-run profile navigation
protection and saved discovery independent of the public page. The local
Supabase database has not been connected to this browser fixture.
Final Firefox desktop fixture run: **10 passed**, logs
`/tmp/dashboard-final-firefox.log`, artifacts `/tmp/dashboard-final-firefox`.
The earlier Firefox failure was an assertion expecting task rows after a reload
that correctly preserved Board; the test now explicitly opens Agenda.
Recording review identified and corrected a CSS specificity collision that made
the Pursue acknowledgement checkbox fill the panel. The core browser path now
asserts its real width and captures `pursue-review-desktop.png` /
`pursue-review-mobile.png`.

The browser suite covers save versus pursue, one creation, cross-view edits,
reload, contributions, assigned Research restrictions, evidence, in-flight typing,
409 conflicts, keyboard focus return, Back, Pass/Undo and private URL capture.
Dense layout covers 60 synthetic tasks at 320 CSS pixels and CSS zoom 2; that is
not a physical browser/device zoom measurement. Chromium CPU4x tests preserve
typing with reduced motion; raw RAF samples are not presentation/GPU smoothness
evidence. Sustained physical-device performance is still unverified.

Captures are explicitly marked synthetic, with no live sends:

- `/tmp/matrix-dashboard-evidence/plan-desktop.png`, `plan-mobile.png`
- `/tmp/matrix-dashboard-evidence/draft-desktop.png`, `draft-mobile.png`
- `/tmp/matrix-dashboard-evidence/activity-desktop.png`, `activity-mobile.png`
- `/tmp/matrix-dashboard-evidence/today-1024-desktop.png`
- `/tmp/matrix-dashboard-evidence/agenda-320-mobile.png`
- `/tmp/matrix-dashboard-evidence/planning-mobile.webm`, `research-mobile.webm`

Wide/narrow plan and draft images were inspected. Recording runs should use
`DASHBOARD_RECORD_ONLY=1` to avoid full-page screenshot viewport changes appearing
in videos. WebKit cannot launch here because required system libraries are absent;
no Safari/iPad pass is claimed. No affected physical phones/laptops were available.
Motion filmstrips were inspected as a layout/transition sanity check, not a
frame-presentation measurement. Final recording-only runs exercise both core
paths without full-page capture interruption; no universal smoothness claim follows.
Recording-only run: **4 passed**, 19.9 seconds, log
`/tmp/dashboard-motion-final.log`; recordings listed above are from that final run.

## Reproducible commands

```sh
npm run build
npm run typecheck
npm test -- --maxWorkers=2
npm run docs:check
TEST_BASE_URL=http://localhost:8799 npx playwright test tests/e2e/dashboard-flows.spec.ts tests/e2e/dashboard-density.spec.ts tests/e2e/workspace.spec.ts --workers=2
TEST_BASE_URL=http://localhost:8799 PROFILE_BROWSER=firefox npx playwright test tests/e2e/dashboard-flows.spec.ts tests/e2e/dashboard-density.spec.ts --project=desktop --workers=1
TEST_BASE_URL=http://localhost:8799 DASHBOARD_RECORD_ONLY=1 npx playwright test tests/e2e/dashboard-flows.spec.ts --grep 'save, reviewed|assigned research' --workers=1
```

For an interactive synthetic preview with a local display:
`TEST_BASE_URL=http://localhost:8799 npx tsx scripts/preview-dashboard.mts`.
The script refuses non-local hosts; there is no production demo/auth-bypass flag.

## Configuration and recovery reference

See [canonical planner storage](../operations/dashboard-plan-storage.md) for
migration activation, backups, row comparisons and non-destructive recovery.
The additive migrations generated here have **not** been applied remotely:
`20261008005351_dashboard_canonical_plan.sql` and
`20261008010345_dashboard_opportunity_decisions.sql`.

Existing server settings come from `nuxt.config.ts`:
`NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_WORKSPACE_SESSION_SECRET`,
`NUXT_WORKSPACE_MAILBOX_ENCRYPTION_KEY`, `NUXT_GOOGLE_OAUTH_CLIENT_ID`,
`NUXT_GOOGLE_OAUTH_CLIENT_SECRET`, `NUXT_MICROSOFT_OAUTH_CLIENT_ID`,
`NUXT_MICROSOFT_OAUTH_CLIENT_SECRET`, `NUXT_MICROSOFT_OAUTH_TENANT`;
public configuration is `NUXT_PUBLIC_SUPABASE_URL`,
`NUXT_PUBLIC_SUPABASE_ANON_KEY`, `NUXT_PUBLIC_SITE_URL`.
Mailbox callback: `https://matrixfellows.com/api/workspace/mailboxes/callback`.
Application login callback: `https://matrixfellows.com/api/workspace/auth/callback`.
Login and mailbox consent remain separate. Never supply secrets in chat or Git.
See [existing integration operations](../operations/partnership-workspace.md)
for OAuth lifecycle, send uncertainty and historical live setup evidence.

## Remaining credential-independent work

This is implemented progress, **not completion of the entire product brief**.
Remaining work includes contextual profile/eligibility questions wired to the
STARS/Clark rules, member travel constraints and actual-worksite verification,
full relationship stages/handoff/manual replies/follow-up tasks, contextual AI
revision previews, reusable material versions and evidence-backed summaries,
bulk actions and complete source-registry/provider orchestration. Rich profile
fact provenance is not yet a full versioned approval model.

Next bounded vertical slice: connect practical constraints and cited eligibility
checks to the research inspector and Pursue review, preserving unknown/conflict
states; then complete relationship follow-up and ownership handoff. Do not request
owner activation to stand in for these implementation gaps. The consolidated
activation request belongs after credential-independent work is ready.
