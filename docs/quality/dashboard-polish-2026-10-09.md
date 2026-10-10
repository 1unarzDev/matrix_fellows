# Dashboard polish — October 9, 2026

Base revision: `9d2d168`, with the pre-existing dashboard/catalog/legal working-tree changes preserved. This checkpoint describes an uncommitted local implementation, not a deployed release.

## Follow-up: restore featured panels

The owner rejected the catalog-row substitution below as a weaker presentation. That design choice is superseded, not the saving or planning implementation. Dashboard discovery now reuses the homepage's `OpportunityCard` featured panels, with two columns on wide screens and one on narrower screens. An optional inspector title/action slot preserves dashboard source inspection, shared saving, Pass/Undo and reviewed pursuit without changing homepage navigation. Display typography and restrained directional feedback follow Guides conventions; the existing glass/bloom hover and reduced-motion treatment come from the shared homepage panel itself.

Production build and typecheck passed. Production-preview Chromium desktop/mobile-emulation checks: 38 passed (58.1 s) across dashboard polish, core flows, density and homepage opportunity timelines; two additional populated-panel checks passed (8.0 s). Tested three cards, a long title, unannounced dates, account saving without tasks, inspector keyboard entry, reduced motion, and 1440/1024/390/320 CSS px layouts. Two visual passes inspected single-record and populated screens. Populated captures: `/tmp/matrix-featured-panels/populated-{width}-{desktop,mobile}.png`; recordings: `test-results/featured-populated/`. The follow-up reused `/tmp/matrix-dashboard-polish/catalog-*.png` for single-record captures, so those now show the restored panels rather than the historical row presentation.

Reproduce with `TEST_BASE_URL=http://localhost:3101 npx playwright test tests/e2e/dashboard-featured-panels.spec.ts --workers=2 --output=test-results/featured-populated`. No live account writes or deployment. Next: owner review of the restored panel presentation, followed by authorized release; physical Safari/Android checks remain outstanding.

### Authorized release

Deployed the tested production output to `matrixfellows.com` on the owner's subsequent request. Cloudflare version: `1465609a-8d75-496f-a0da-6a33c1724e92`; previous version: `765efa4b-e82e-4057-b3f3-e877201e09b9`. Command: `npx wrangler deploy`. Live Chromium checks returned HTTP 200 for `/login`, `/privacy`, `/terms`, `/opportunities`, `/guides` and `/dashboard`; the login password control rendered. Featured-panel desktop/mobile-emulation tests against the deployed assets passed (2 checks, 8.5 s), with synthetic API fixtures and no real account writes. Recordings: `test-results/featured-live/`. No database migrations, additional worker deployments, commit or push were performed. Physical-device and real-account persistence checks remain outstanding.

## Implemented

- Removed the visible “Jump to” button; Ctrl/Cmd+K still opens keyboard navigation.
- Separated the navigation divider from Draft review. Rounded buttons remain intact; the divider becomes vertical in the horizontal mobile navigation. Programmatic section changes scroll the navigation horizontally without jumping the document.
- Removed the legacy archive destination and screen, not its persisted records. Old `section=saved` links open canonical Opportunities. Assigned research remains available in Research.
- Replaced custom dashboard opportunity cards with the public `OpportunityResultRow`, preserving the inspector, Pass/Undo, and reviewed pursuit workflow. Shared typography, fine rules, restrained gold, pill controls and hover treatment follow the public Opportunities/Guides conventions. Mobile rows no longer squeeze descriptions alongside the action column.
- Shared save state across public catalog, detail, calendar and dashboard. Guests retain localStorage saves. Verified sign-in switches to the owned account collection, with an explicit browser-save transfer prompt on catalog, detail and dashboard. Account IDs never enter guest storage. No save creates a commitment.
- Added a lightweight owned-ID query to the existing account-save endpoint. It skips catalog hydration, preserves unavailable references and returns `Cache-Control: no-store`. No database schema or access changes.
- Saves wait for successful persistence; failures retain the previous state. Account changes reject stale responses. Reads are single-flight across rows, refresh on route entry/window focus, and guest storage changes propagate across tabs.

## Evidence

Three visual passes examined catalog/draft/transfer screenshots. Corrected cramped mobile titles, wrapped Add task text, split footer controls, divider geometry and transitional screenshot capture. Captures at 1440, 1024, 390 and 320 CSS px are in `/tmp/matrix-dashboard-polish/`. These are explicitly labeled synthetic fixtures. Flow recordings are in `test-results/e2e/`.

- `npm run test`: 335 tests passed across 52 files.
- `npm run typecheck`: passed.
- `npm run build`: Cloudflare production build passed.
- Production preview: `npx wrangler dev --port 3101 --host localhost --local-upstream localhost`.
- `TEST_BASE_URL=http://localhost:3101 npx playwright test tests/e2e/dashboard-polish.spec.ts tests/e2e/dashboard-flows.spec.ts tests/e2e/dashboard-density.spec.ts tests/e2e/workspace.spec.ts --workers=2`: 36 checks passed (57.6 s).
- Public catalog regression: `TEST_BASE_URL=http://localhost:3101 npx playwright test tests/e2e/opportunity-filter-chips.spec.ts tests/e2e/opportunity-facts.spec.ts --workers=2 --output=test-results/catalog-regression`: 8 checks passed (7.8 s).

Browser evidence covers browser-save reload, explicit transfer, account switching/logout isolation, failed writes, independent saved collection, inspector/Back, reviewed pursuit, canonical planning views, draft autosave/conflicts, permission boundaries, keyboard navigation, reduced motion, 200% CSS zoom, 60-task density and 4× CPU-throttled typing. Raw RAF attachments are not GPU presentation measurements. No physical-device or universal frame-rate claim.

An earlier parallel Playwright invocation interfered with another run's output directory during teardown. Both suites were rerun together, then against the production preview; all 36 passed. Public-page fixtures wait for hydration before submitting the progressively enhanced search form.

## Remaining verification

No real Supabase account writes, provider sends or data deletion were performed during these fixture checks. Firefox/WebKit and physical-device visual checks remain gaps. Next live functional check: verify saves with two real accounts and guest-to-account transfer on physical Safari/Android.

## Consolidated release — October 9

Owner authorized committing, pushing and deploying the dashboard alongside the already released join-form refinements. Dashboard, shared featured opportunity panels and saves, account policies, canonical planner routes/contracts, and their tests are included; unrelated catalog expansion, worker changes and email-template work remain outside this commit. The two planner migrations were already applied (see the October 7 operations release record); this release does not rerun migrations.

- Full working-tree unit regression: 335 tests passed across 52 files.
- Production-preview Chromium desktop/mobile dashboard, login and policy suites: 66 passed (1.6 minutes), using synthetic workspace API fixtures rather than live account writes.
- Index-only export to a temporary directory: production build passed, confirming staged application dependencies do not rely on unstaged files.
- Join-form refinements are preceding commits, most recently `2fe7f3a`; desktop paired-column alignment and narrow layouts were verified separately.

Provider activation and authenticated live persistence are not implied by a website deployment. No real outreach was sent.

## Save feedback and controls refinement — October 9

Cause reproduced with a 1,200 ms delayed save response: the icon and spring animation waited for persistence; the old UI failed a 250 ms feedback assertion. The collection now reflects intent immediately, confirms from the server, rolls back on failure, and protects against stale responses after an account change. Same-account refreshes cannot overwrite an in-flight intent. Saved-list refresh waits until persistence finishes. A pending indicator is not a successful persistence claim; failed confirmation offers Retry.

Default card actions are now Details at left and the compact save control at right, with matching 44 px heights. New Pass actions and their dialog were removed; stored decisions and restoration of previously passed items remain accessible. Source verification is retained above the actions.

Dashboard native checks are 22 px transparent outlined controls; profile/consent checks use the shared checkbox's 24 px outlined variant without changing the join form default. Task completion uses a 28 px outlined frame, animated SVG tick and 44 px hit target. Reduced-motion and keyboard behavior remain available.

Discovery uses the public catalog's `OpportunityFilterFields` disclosures, removable filter chips, and a compact responsive panel. Participation filters use `participation` in dashboard URLs to avoid colliding with Discover/My plan's `mode`; requests use the public API's normal facet names. Owned saved collections apply those validated facets before pagination. Mobile search and action rows use a two-column grid.

Verification: 336 unit checks passed; build and type checks passed; an index-only exported release built successfully. Captures and filter interaction recordings are in `/tmp/matrix-dashboard-controls` and `test-results/dashboard-controls-final`. Production-preview core paths, save rollback/retry, filtering/Back, reduced motion, task persistence, narrow layouts and density are fixture-tested. Join-panel regression: two passed. An intermediate development run failed a profile timing check while rebuilds were occurring; immutable-production checks subsequently passed. A separate card-alignment check read moving elements across separate browser calls; both bounds are now read atomically, preserving its alignment assertion.

Final production-preview rerun after the mobile-grid correction: 30 passed (60 seconds), output `test-results/dashboard-controls-release`; all source and fixture handlers remained unchanged during the run. Delayed-response save checks passed on both desktop and mobile. Screenshot passes covered the card footer, filter panel, selected transparent checks, profile consent and completed-task controls.

No provider sends, live account writes or migrations were performed. Next: physical-device interaction review and authorized live-account persistence verification; do not infer physical-device performance from these Chromium emulations.
