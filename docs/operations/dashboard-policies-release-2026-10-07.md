# Dashboard and account-policy release

Deployed October 7, 2026, 22:05 America/Chicago. User-authorized website release.

## Release identity and scope

- Cloudflare Worker: `matrix-fellows`, custom domain `matrixfellows.com`.
- Live version: `8483733d-dd25-4f8b-ac8d-7e364a9fbcd3`.
- Prior version: `13ddb5ec-eb96-4773-bd5e-1860afa61699`.
- Repository base: `828f748` plus explicitly copied dashboard/legal changes;
  no commit or push was made. Isolated build: `/tmp/matrix-dashboard-release.TplIcz`.
- Asset fingerprint: `f2acfa9f3fb7bda21b9397fd7d8b23978a58838af223a08e92ed55f476f922be`.
  SHA256 of sorted relative `_nuxt` paths plus each file's SHA256, including nested files.
- Preserved unrelated working-tree catalog/admin/import changes without deploying them.
  No research/import Worker release, AI activation, real mail, application submission,
  role change, OAuth configuration or secret rotation occurred.

Published the four-destination dashboard and canonical planner, private saved
opportunities, reviewed Pursue, activities/contributions, capacity and calendar
export, assigned-target research/draft improvements, and the public account
policies. Added login policy links, sitemap entries and the footer Dashboard icon.
The public cinematic sequence was unchanged apart from that footer icon.

## Database activation

Applied only `20261008005351_dashboard_canonical_plan.sql` and
`20261008010345_dashboard_opportunity_decisions.sql` to project
`xlnjzzbsxzadrvbrggau`, then registered both in migration history using CLI repair.
Did not run a blanket migration push. Prerequisite migrations 023/028 were present.

Preflight legacy planner count: **0**. Postflight legacy/migrated counts: **0/0**.
Original tables, profiles, drafts and contact history were not modified by these
additive migrations. Supabase backup listing returned no available backups and
PITR disabled; no recoverable full-database backup was established in this release.
The empty affected legacy ledger, unchanged original tables and transactional
additive SQL limited migration risk; this is not a claim of general backup coverage.

Verified on the live database that all seven new tables have RLS enabled, no
anonymous SELECT, no authenticated INSERT and service-role write grants. Both
`dashboard_pursue` and `dashboard_decide_opportunity` deny anonymous/authenticated
EXECUTE and grant service-role EXECUTE. Owner isolation and transactional behavior
were exercised against PGlite fixtures, not a signed-in production account.

## Verification

- Isolated production build, application/Worker typecheck, deployment dry run: passed.
- Focused dashboard, legal and PGlite tests: **54 passed / 8 files**.
- Scoped production-preview Chromium checks: **40 passed**, desktop and phone
  emulation, including research-to-draft, opportunity-to-plan, edits/reload,
  conflicts, keyboard/reduced motion, policy navigation and login states.
- Live Chromium policy checks: **6 passed**, desktop and phone emulation.
- Live `/privacy`, `/terms`, `/login`, `/dashboard`, `/sitemap.xml`: HTTP 200.
  Static legal routes redirect to trailing-slash URLs and retain slashless canonicals.
- Both legal URLs appear in sitemap; private dashboard does not. Login links and
  footer icon verified by live browser checks; no legal links added to footer.
- Live `/api/workspace/plan`, `/relationships`, `/catalog-saves`: HTTP 401 without
  a session. Auth session reports configured and unauthenticated; private routes
  have noindex headers. Deployment retained all nine existing server secrets.

Dashboard flow checks used synthetic API fixtures. No signed-in live persistence
or provider login was exercised; those remain explicit verification gaps. Physical
devices and Safari were unavailable. Policy text is not lawyer-reviewed. This is
a deployed implementation increment, not completion of the whole dashboard brief.

## Provider URLs and next check

- Homepage: `https://matrixfellows.com`
- Privacy: `https://matrixfellows.com/privacy`
- Terms: `https://matrixfellows.com/terms`
- Login: `https://matrixfellows.com/login`

OAuth login configuration remains separate from mailbox consent. Follow the
existing [integration operations](partnership-workspace.md) for provider-specific
callback URLs and settings. After owner configuration, test the selected login
account, then create/edit/reload a harmless personal task and remove it deliberately.
Do not use a live send to validate login.

## Reproduce and recover

```sh
# Run in the scoped release directory, not the mixed working tree.
npm run build
npm run typecheck
TEST_BASE_URL=http://localhost:8801 npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/login-interface.spec.ts tests/e2e/dashboard-flows.spec.ts tests/e2e/dashboard-density.spec.ts --workers=2
npx wrangler deploy --keep-vars --tag dashboard-policies-20261007 --message 'Scoped dashboard canonical planning and public account policies; base 828f748'
TEST_BASE_URL=https://matrixfellows.com npx playwright test tests/e2e/legal-pages.spec.ts --workers=2

# Recovery only if needed; not executed as part of this release.
npx wrangler rollback 13ddb5ec-eb96-4773-bd5e-1860afa61699 --name matrix-fellows --message 'Restore pre-dashboard-policy release'
```

Keep additive tables after any interface rollback. New user work must be exported
and reconciled before switching authoritative ledgers; never drop tables as an
automatic rollback. See [planner recovery](dashboard-plan-storage.md).
